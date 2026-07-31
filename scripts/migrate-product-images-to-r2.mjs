#!/usr/bin/env node
/**
 * Migrate public.products image_url / image_urls from Supabase Storage to Cloudflare R2.
 *
 * Mapping example:
 *   https://….storage.supabase.co/storage/v1/object/public/saigon-express-tasmania/images/chef-half-roasted-duck_c53fe898.jpg
 *     → https://cdn.saigonexpress.com.au/products/images/chef-half-roasted-duck_c53fe898.jpg
 *   https://cdn.saigonexpresstasmania.com.au/products/images/chef-half-roasted-duck_c53fe898.jpg
 *     → https://cdn.saigonexpress.com.au/products/images/chef-half-roasted-duck_c53fe898.jpg
 *
 * Before updating a row, each mapped R2 object is checked with HeadObject.
 * If missing, the script downloads from the original Supabase URL, uploads to R2,
 * then updates the DB. Those re-uploads are logged as special cases.
 *
 * Usage:
 *   node scripts/migrate-product-images-to-r2.mjs --dry-run
 *   node scripts/migrate-product-images-to-r2.mjs --apply
 *   node scripts/migrate-product-images-to-r2.mjs --apply --limit=20
 *   node scripts/migrate-product-images-to-r2.mjs --apply --product-type=alacarte
 *
 * Env (root / admin .env):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   R2_* or VITE_R2_* (account, keys, bucket, public URL)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  buildR2PublicUrl,
  normalizeObjectKey,
  requireR2Config,
  r2ObjectExists,
  uploadR2Object,
} from "./lib/r2-client.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_BUCKET = "saigon-express-tasmania";
const PAGE_SIZE = 500;

const options = parseArgs(process.argv.slice(2));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const logDir = path.join(root, "refs");
const logPath = path.join(logDir, `migrate-product-images-to-r2-${stamp}.log`);
const summaryPath = path.join(
  logDir,
  `migrate-product-images-to-r2-${stamp}-summary.json`,
);

const logLines = [];

main().catch((error) => {
  log("ERROR", error?.stack || String(error));
  flushLogs();
  process.exitCode = 1;
});

async function main() {
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, "admin/.env"));
  loadEnvFile(path.join(root, "admin/.env.local"));

  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  // Existence checks need R2 credentials even in dry-run.
  const r2 = requireR2Config({ requirePublicUrl: true });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const bucket =
    process.env.SUPABASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ??
    r2.bucket ??
    DEFAULT_BUCKET;

  log(
    "INFO",
    `Starting migrate-product-images-to-r2 (${options.dryRun ? "dry-run" : "APPLY"})`,
  );
  log("INFO", `Supabase bucket: ${bucket}`);
  log("INFO", `R2 public URL: ${r2.publicUrl}`);
  log("INFO", `R2 bucket: ${r2.bucket || "(unset)"}`);
  if (options.productType) log("INFO", `Filter product_type=${options.productType}`);
  if (options.limit) log("INFO", `Limit ${options.limit} products`);

  const products = await fetchAllProducts(supabase);
  log("INFO", `Loaded ${products.length} products from database`);

  const summary = {
    generated_at: new Date().toISOString(),
    dry_run: options.dryRun,
    product_type: options.productType,
    limit: options.limit,
    supabase_bucket: bucket,
    r2_public_url: r2.publicUrl,
    r2_bucket: r2.bucket,
    products_scanned: products.length,
    products_with_supabase_urls: 0,
    products_updated: 0,
    products_unchanged: 0,
    products_failed: 0,
    urls_seen: 0,
    urls_already_r2: 0,
    urls_mapped: 0,
    urls_r2_exists: 0,
    urls_reuploaded: 0,
    urls_download_failed: 0,
    urls_upload_failed: 0,
    urls_unchanged: 0,
    special_cases: [],
    product_failures: [],
  };

  /** @type {Map<string, Promise<{ exists: boolean, reuploaded: boolean, error?: string }>>} */
  const objectChecks = new Map();

  let scanned = 0;
  for (const product of products) {
    scanned += 1;
    try {
      const result = await processProduct({
        product,
        bucket,
        r2PublicUrl: r2.publicUrl,
        dryRun: options.dryRun,
        objectChecks,
        summary,
      });

      if (result.hadSupabaseUrls) summary.products_with_supabase_urls += 1;

      if (result.changed) {
        if (!options.dryRun) {
          const { error } = await supabase
            .from("products")
            .update({
              image_url: result.image_url,
              image_urls: result.image_urls,
            })
            .eq("id", product.id);

          if (error) {
            throw new Error(`DB update failed: ${error.message}`);
          }
        }
        summary.products_updated += 1;
        log(
          "UPDATE",
          `product ${product.id} (${product.product_type}) ${product.name ?? ""} — ${result.mappedCount} url(s) mapped${result.reuploadedCount ? `, ${result.reuploadedCount} re-uploaded` : ""}${options.dryRun ? " [dry-run]" : ""}`,
        );
      } else {
        summary.products_unchanged += 1;
      }
    } catch (error) {
      summary.products_failed += 1;
      const message = error?.message || String(error);
      summary.product_failures.push({
        id: product.id,
        product_type: product.product_type,
        name: product.name,
        error: message,
      });
      log(
        "ERROR",
        `product ${product.id} (${product.product_type}) failed: ${message}`,
      );
    }

    if (scanned % 25 === 0) flushLogs();
  }

  flushLogs();
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log("");
  console.log(options.dryRun ? "=== Dry run summary ===" : "=== Apply summary ===");
  console.log(`Products scanned: ${summary.products_scanned}`);
  console.log(`Products with Supabase URLs: ${summary.products_with_supabase_urls}`);
  console.log(`Products updated: ${summary.products_updated}${options.dryRun ? " (planned)" : ""}`);
  console.log(`Products unchanged: ${summary.products_unchanged}`);
  console.log(`Products failed: ${summary.products_failed}`);
  console.log(`URLs mapped: ${summary.urls_mapped}`);
  console.log(`R2 already had object: ${summary.urls_r2_exists}`);
  console.log(`Re-uploaded missing objects: ${summary.urls_reuploaded}`);
  console.log(`Download failures: ${summary.urls_download_failed}`);
  console.log(`Upload failures: ${summary.urls_upload_failed}`);
  console.log(`Special cases logged: ${summary.special_cases.length}`);
  console.log(`Log file: ${relativize(logPath)}`);
  console.log(`Summary JSON: ${relativize(summaryPath)}`);
}

async function processProduct({
  product,
  bucket,
  r2PublicUrl,
  dryRun,
  objectChecks,
  summary,
}) {
  let mappedCount = 0;
  let reuploadedCount = 0;
  let hadSupabaseUrls = false;
  let changed = false;

  async function mapUrl(value, field) {
    summary.urls_seen += 1;
    if (typeof value !== "string" || !value.trim()) return value;

    const trimmed = value.trim();
    const parsed =
      parseSupabaseStorageUrl(trimmed, bucket) ?? parseLegacyCdnUrl(trimmed);

    if (!parsed) {
      if (isAlreadyR2Url(trimmed, r2PublicUrl)) {
        summary.urls_already_r2 += 1;
      } else {
        summary.urls_unchanged += 1;
      }
      return value;
    }

    hadSupabaseUrls = true;
    const r2ObjectPath = toR2ObjectPath(parsed.objectPath);
    const nextUrl = buildR2PublicUrl(r2PublicUrl, r2ObjectPath);

    // Already on the new CDN with the final object path — nothing to do.
    if (nextUrl === trimmed) {
      summary.urls_already_r2 += 1;
      return value;
    }

    const ensure = await ensureR2Object({
      objectPath: r2ObjectPath,
      sourceUrl: trimmed,
      dryRun,
      objectChecks,
      summary,
      product,
      field,
    });

    if (ensure.error) {
      throw new Error(`${field}: ${ensure.error}`);
    }

    mappedCount += 1;
    summary.urls_mapped += 1;
    if (ensure.reuploaded) reuploadedCount += 1;
    if (ensure.exists && !ensure.reuploaded) summary.urls_r2_exists += 1;

    if (nextUrl !== trimmed) changed = true;
    return nextUrl;
  }

  const nextImageUrl = await mapUrl(product.image_url, "image_url");
  const nextImageUrls = await mapImageUrlsTree(product.image_urls, mapUrl);

  if (
    JSON.stringify(nextImageUrls ?? null) !==
      JSON.stringify(product.image_urls ?? null) ||
    nextImageUrl !== product.image_url
  ) {
    changed = true;
  }

  return {
    changed,
    hadSupabaseUrls,
    mappedCount,
    reuploadedCount,
    image_url: nextImageUrl,
    image_urls: nextImageUrls,
  };
}

async function mapImageUrlsTree(imageUrls, mapUrl) {
  if (!imageUrls || typeof imageUrls !== "object" || Array.isArray(imageUrls)) {
    return imageUrls ?? {};
  }

  const next = {};
  for (const [key, value] of Object.entries(imageUrls)) {
    if (key === "more" && Array.isArray(value)) {
      next.more = [];
      for (const [index, entry] of value.entries()) {
        if (!entry || typeof entry !== "object") {
          next.more.push(entry);
          continue;
        }
        next.more.push({
          ...entry,
          sm: await mapUrl(entry.sm, `image_urls.more[${index}].sm`),
          lg: await mapUrl(entry.lg, `image_urls.more[${index}].lg`),
        });
      }
      continue;
    }

    if (typeof value === "string") {
      next[key] = await mapUrl(value, `image_urls.${key}`);
    } else {
      next[key] = value;
    }
  }
  return next;
}

async function ensureR2Object({
  objectPath,
  sourceUrl,
  dryRun,
  objectChecks,
  summary,
  product,
  field,
}) {
  if (!objectChecks.has(objectPath)) {
    objectChecks.set(
      objectPath,
      (async () => {
        let exists = false;
        try {
          exists = await r2ObjectExists(objectPath);
        } catch (error) {
          return {
            exists: false,
            reuploaded: false,
            error: `R2 head failed for ${objectPath}: ${error?.message || error}`,
          };
        }

        if (exists) {
          return { exists: true, reuploaded: false };
        }

        // Special case: object missing on R2 — download from Supabase and re-upload.
        const special = {
          product_id: product.id,
          product_type: product.product_type,
          product_name: product.name,
          field,
          source_url: sourceUrl,
          r2_object_path: objectPath,
          action: dryRun ? "would_reupload" : "reuploaded",
        };

        if (dryRun) {
          summary.urls_reuploaded += 1;
          summary.special_cases.push(special);
          log(
            "SPECIAL",
            `MISSING ON R2 — would re-upload product ${product.id} ${field}: ${sourceUrl} → ${objectPath}`,
          );
          return { exists: false, reuploaded: true };
        }

        try {
          const downloaded = await downloadUrl(sourceUrl);
          await uploadR2Object(
            objectPath,
            downloaded.buffer,
            downloaded.contentType,
          );
          summary.urls_reuploaded += 1;
          special.bytes = downloaded.buffer.byteLength;
          special.content_type = downloaded.contentType;
          summary.special_cases.push(special);
          log(
            "SPECIAL",
            `MISSING ON R2 — re-uploaded product ${product.id} ${field}: ${sourceUrl} → ${objectPath} (${downloaded.buffer.byteLength} bytes, ${downloaded.contentType})`,
          );
          return { exists: true, reuploaded: true };
        } catch (error) {
          const message = error?.message || String(error);
          if (/download/i.test(message)) summary.urls_download_failed += 1;
          else summary.urls_upload_failed += 1;
          special.action = "failed";
          special.error = message;
          summary.special_cases.push(special);
          log(
            "SPECIAL",
            `MISSING ON R2 — FAILED product ${product.id} ${field}: ${sourceUrl} → ${objectPath}: ${message}`,
          );
          return { exists: false, reuploaded: false, error: message };
        }
      })(),
    );
  }

  return objectChecks.get(objectPath);
}

async function downloadUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed ${response.status} for ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const headerType = response.headers.get("content-type") || "";
  const contentType =
    headerType.split(";")[0].trim() || mimeTypeForPath(url) || "application/octet-stream";
  return { buffer, contentType };
}

function parseSupabaseStorageUrl(value, bucket) {
  if (typeof value !== "string" || !value.includes("/storage/v1/object/public/")) {
    return null;
  }

  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/public/${encodeURIComponent(bucket)}/`,
  ];

  for (const marker of markers) {
    const index = value.indexOf(marker);
    if (index === -1) continue;
    const raw = value.slice(index + marker.length).split("?")[0] ?? "";
    if (!raw) return null;
    try {
      return { objectPath: normalizeObjectKey(decodeURIComponent(raw)) };
    } catch {
      return { objectPath: normalizeObjectKey(raw) };
    }
  }

  return null;
}

/** Old custom domain that should be rewritten to VITE_R2_PUBLIC_URL. */
const LEGACY_CDN_BASES = [
  "https://cdn.saigonexpresstasmania.com.au",
  "http://cdn.saigonexpresstasmania.com.au",
];

function parseLegacyCdnUrl(value) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return null;

  for (const base of LEGACY_CDN_BASES) {
    const normalizedBase = base.replace(/\/+$/, "");
    if (!value.startsWith(`${normalizedBase}/`) && value !== normalizedBase) {
      continue;
    }
    const raw = value.slice(normalizedBase.length).replace(/^\/+/, "").split("?")[0] ?? "";
    if (!raw) return null;
    try {
      return { objectPath: normalizeObjectKey(decodeURIComponent(raw)), source: "legacy_cdn" };
    } catch {
      return { objectPath: normalizeObjectKey(raw), source: "legacy_cdn" };
    }
  }

  return null;
}

function toR2ObjectPath(supabaseObjectPath) {
  const objectPath = normalizeObjectKey(supabaseObjectPath);
  if (objectPath.startsWith("products/")) return objectPath;
  return `products/${objectPath}`;
}

function isAlreadyR2Url(value, r2PublicUrl) {
  const base = String(r2PublicUrl ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!base) return false;
  return value.startsWith(`${base}/`);
}

async function fetchAllProducts(supabase) {
  const rows = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("products")
      .select("id, product_type, name, image_url, image_urls")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (options.productType) {
      query = query.eq("product_type", options.productType);
    }

    const { data, error } = await query;
    if (error) throw new Error(`products select failed: ${error.message}`);

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;

    if (options.limit && rows.length >= options.limit) break;
  }

  if (options.limit && rows.length > options.limit) {
    return rows.slice(0, options.limit);
  }
  return rows;
}

function parseArgs(inputArgs) {
  const result = {
    dryRun: !inputArgs.includes("--apply"),
    productType: null,
    limit: null,
  };

  for (const arg of inputArgs) {
    if (arg === "--dry-run") result.dryRun = true;
    if (arg === "--apply") result.dryRun = false;
    if (arg.startsWith("--product-type=")) {
      result.productType = arg.slice("--product-type=".length).trim() || null;
    }
    if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length));
      result.limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    }
  }

  return result;
}

function mimeTypeForPath(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return null;
  }
}

function log(level, message) {
  const line = `[${new Date().toISOString()}] ${level} ${message}`;
  logLines.push(line);
  if (level === "ERROR" || level === "SPECIAL") {
    console.error(line);
  } else {
    console.log(line);
  }
}

function flushLogs() {
  fs.writeFileSync(logPath, `${logLines.join("\n")}\n`, "utf8");
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function relativize(absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/");
}
