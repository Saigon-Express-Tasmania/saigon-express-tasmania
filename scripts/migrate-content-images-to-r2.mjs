#!/usr/bin/env node
/**
 * Migrate image URLs from Supabase Storage to Cloudflare R2 for:
 *   - blog_posts (featured_image_url, news_logo_image_url, content HTML, reference)
 *   - category_groups ("imageUrl") — R2 keys prefixed with products/
 *   - email_templates (html_body, html_extensions, text_body, text_extensions, reference)
 *   - featured_reviews (reviewer_picture)
 *
 * Same flow as migrate-product-images-to-r2.mjs:
 *   1. Find Supabase public storage URLs
 *   2. Map to R2 public URLs
 *   3. HeadObject on R2; if missing, download from Supabase and re-upload
 *   4. Update the DB row
 *   5. Log special cases (missing → reupload) to a log + summary JSON
 *
 * Path mapping:
 *   category_groups:  <supabase-key> → products/<supabase-key>
 *   other tables:     same object key on R2
 *
 * Also rewrites legacy CDN host:
 *   https://cdn.saigonexpresstasmania.com.au/<path>
 *     → {VITE_R2_PUBLIC_URL}/<path>  (with products/ prefix for category_groups)
 *
 * Usage:
 *   node scripts/migrate-content-images-to-r2.mjs --dry-run
 *   node scripts/migrate-content-images-to-r2.mjs --apply
 *   node scripts/migrate-content-images-to-r2.mjs --apply --tables=blog_posts,featured_reviews
 *   node scripts/migrate-content-images-to-r2.mjs --apply --limit=20
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

const ALL_TABLES = [
  "blog_posts",
  "category_groups",
  "email_templates",
  "featured_reviews",
];

const options = parseArgs(process.argv.slice(2));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const logDir = path.join(root, "refs");
const logPath = path.join(logDir, `migrate-content-images-to-r2-${stamp}.log`);
const summaryPath = path.join(
  logDir,
  `migrate-content-images-to-r2-${stamp}-summary.json`,
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
    `Starting migrate-content-images-to-r2 (${options.dryRun ? "dry-run" : "APPLY"})`,
  );
  log("INFO", `Tables: ${options.tables.join(", ")}`);
  log("INFO", `Supabase bucket: ${bucket}`);
  log("INFO", `R2 public URL: ${r2.publicUrl}`);
  log("INFO", `R2 bucket: ${r2.bucket || "(unset)"}`);
  if (options.limit) log("INFO", `Limit ${options.limit} rows per table`);

  const summary = {
    generated_at: new Date().toISOString(),
    dry_run: options.dryRun,
    tables: options.tables,
    limit: options.limit,
    supabase_bucket: bucket,
    r2_public_url: r2.publicUrl,
    r2_bucket: r2.bucket,
    urls_seen: 0,
    urls_already_r2: 0,
    urls_mapped: 0,
    urls_r2_exists: 0,
    urls_reuploaded: 0,
    urls_download_failed: 0,
    urls_upload_failed: 0,
    urls_unchanged: 0,
    special_cases: [],
    tables_summary: {},
  };

  /** @type {Map<string, Promise<{ exists: boolean, reuploaded: boolean, error?: string }>>} */
  const objectChecks = new Map();

  for (const table of options.tables) {
    const tableSummary = await migrateTable({
      table,
      supabase,
      bucket,
      r2PublicUrl: r2.publicUrl,
      dryRun: options.dryRun,
      objectChecks,
      summary,
    });
    summary.tables_summary[table] = tableSummary;
  }

  flushLogs();
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log("");
  console.log(options.dryRun ? "=== Dry run summary ===" : "=== Apply summary ===");
  for (const table of options.tables) {
    const t = summary.tables_summary[table];
    console.log(
      `${table}: scanned=${t.rows_scanned} updated=${t.rows_updated}${options.dryRun ? " (planned)" : ""} failed=${t.rows_failed} mapped_urls=${t.urls_mapped} reuploaded=${t.urls_reuploaded}`,
    );
  }
  console.log(`URLs mapped (all tables): ${summary.urls_mapped}`);
  console.log(`R2 already had object: ${summary.urls_r2_exists}`);
  console.log(`Re-uploaded missing objects: ${summary.urls_reuploaded}`);
  console.log(`Special cases logged: ${summary.special_cases.length}`);
  console.log(`Log file: ${relativize(logPath)}`);
  console.log(`Summary JSON: ${relativize(summaryPath)}`);
}

async function migrateTable({
  table,
  supabase,
  bucket,
  r2PublicUrl,
  dryRun,
  objectChecks,
  summary,
}) {
  const config = tableConfig(table);
  const rows = await fetchAllRows(supabase, config);
  log("INFO", `${table}: loaded ${rows.length} row(s)`);

  const tableSummary = {
    rows_scanned: rows.length,
    rows_with_supabase_urls: 0,
    rows_updated: 0,
    rows_unchanged: 0,
    rows_failed: 0,
    urls_mapped: 0,
    urls_reuploaded: 0,
    failures: [],
  };

  let scanned = 0;
  for (const row of rows) {
    scanned += 1;
    const rowLabel = config.label(row);

    try {
      const ctx = {
        table,
        rowId: row[config.idColumn],
        rowLabel,
        pathMode: config.pathMode,
        bucket,
        r2PublicUrl,
        dryRun,
        objectChecks,
        summary,
        tableSummary,
      };

      const result = await config.process(row, ctx);

      if (result.hadSupabaseUrls) tableSummary.rows_with_supabase_urls += 1;

      if (result.changed) {
        if (!dryRun) {
          const { error } = await supabase
            .from(table)
            .update(result.patch)
            .eq(config.idColumn, row[config.idColumn]);

          if (error) {
            throw new Error(`DB update failed: ${error.message}`);
          }
        }
        tableSummary.rows_updated += 1;
        tableSummary.urls_mapped += result.mappedCount;
        tableSummary.urls_reuploaded += result.reuploadedCount;
        log(
          "UPDATE",
          `${table} ${row[config.idColumn]} (${rowLabel}) — ${result.mappedCount} url(s) mapped${result.reuploadedCount ? `, ${result.reuploadedCount} re-uploaded` : ""}${dryRun ? " [dry-run]" : ""}`,
        );
      } else {
        tableSummary.rows_unchanged += 1;
      }
    } catch (error) {
      tableSummary.rows_failed += 1;
      const message = error?.message || String(error);
      tableSummary.failures.push({
        id: row[config.idColumn],
        label: rowLabel,
        error: message,
      });
      log("ERROR", `${table} ${row[config.idColumn]} (${rowLabel}) failed: ${message}`);
    }

    if (scanned % 25 === 0) flushLogs();
  }

  return tableSummary;
}

function tableConfig(table) {
  switch (table) {
    case "blog_posts":
      return {
        name: table,
        idColumn: "id",
        select:
          "id, slug, title, content, featured_image_url, news_logo_image_url, reference",
        orderColumn: "id",
        pathMode: "keep",
        label: (row) => row.slug || row.title || String(row.id),
        async process(row, ctx) {
          const tracker = createUrlTracker(ctx);
          const featured_image_url = await tracker.mapUrl(
            row.featured_image_url,
            "featured_image_url",
          );
          const news_logo_image_url = await tracker.mapUrl(
            row.news_logo_image_url,
            "news_logo_image_url",
          );
          const content = await tracker.mapText(row.content, "content");
          const reference = await mapBlogReference(row.reference, tracker);

          const patch = {
            featured_image_url,
            news_logo_image_url,
            content,
            reference,
          };

          return {
            ...tracker.stats(),
            changed: !deepEqual(
              {
                featured_image_url: row.featured_image_url,
                news_logo_image_url: row.news_logo_image_url,
                content: row.content,
                reference: row.reference,
              },
              patch,
            ),
            patch,
          };
        },
      };

    case "category_groups":
      return {
        name: table,
        idColumn: "id",
        select: 'id, name, alias, "imageUrl"',
        orderColumn: "id",
        pathMode: "products_prefix",
        label: (row) => row.alias || row.name || String(row.id),
        async process(row, ctx) {
          const tracker = createUrlTracker(ctx);
          const imageUrl = await tracker.mapUrl(row.imageUrl, "imageUrl");
          const patch = { imageUrl };
          return {
            ...tracker.stats(),
            changed: imageUrl !== row.imageUrl,
            patch,
          };
        },
      };

    case "email_templates":
      return {
        name: table,
        idColumn: "id",
        select:
          "id, name, html_body, html_extensions, text_body, text_extensions, reference",
        orderColumn: "name",
        pathMode: "keep",
        label: (row) => row.name || String(row.id),
        async process(row, ctx) {
          const tracker = createUrlTracker(ctx);
          const html_body = await tracker.mapText(row.html_body, "html_body");
          const text_body = await tracker.mapText(row.text_body, "text_body");
          const html_extensions = await mapStringArray(
            row.html_extensions,
            "html_extensions",
            tracker,
          );
          const text_extensions = await mapStringArray(
            row.text_extensions,
            "text_extensions",
            tracker,
          );
          const reference = await mapEmailReference(row.reference, tracker);

          const patch = {
            html_body,
            text_body,
            html_extensions,
            text_extensions,
            reference,
          };

          return {
            ...tracker.stats(),
            changed: !deepEqual(
              {
                html_body: row.html_body,
                text_body: row.text_body,
                html_extensions: row.html_extensions,
                text_extensions: row.text_extensions,
                reference: row.reference,
              },
              patch,
            ),
            patch,
          };
        },
      };

    case "featured_reviews":
      return {
        name: table,
        idColumn: "id",
        select: "id, reviewer_name, reviewer_picture",
        orderColumn: "id",
        pathMode: "keep",
        label: (row) => row.reviewer_name || String(row.id),
        async process(row, ctx) {
          const tracker = createUrlTracker(ctx);
          const reviewer_picture = await tracker.mapUrl(
            row.reviewer_picture,
            "reviewer_picture",
          );
          return {
            ...tracker.stats(),
            changed: reviewer_picture !== row.reviewer_picture,
            patch: { reviewer_picture },
          };
        },
      };

    default:
      throw new Error(`Unsupported table: ${table}`);
  }
}

function createUrlTracker(ctx) {
  let mappedCount = 0;
  let reuploadedCount = 0;
  let hadSupabaseUrls = false;

  async function mapUrl(value, field) {
    ctx.summary.urls_seen += 1;
    if (typeof value !== "string" || !value.trim()) return value;

    const trimmed = value.trim();
    const parsed =
      parseSupabaseStorageUrl(trimmed, ctx.bucket) ?? parseLegacyCdnUrl(trimmed);

    if (!parsed) {
      if (isAlreadyR2Url(trimmed, ctx.r2PublicUrl)) {
        ctx.summary.urls_already_r2 += 1;
      } else {
        ctx.summary.urls_unchanged += 1;
      }
      return value;
    }

    hadSupabaseUrls = true;
    const r2ObjectPath = toR2ObjectPath(parsed.objectPath, ctx.pathMode);
    const nextUrl = buildR2PublicUrl(ctx.r2PublicUrl, r2ObjectPath);

    if (nextUrl === trimmed) {
      ctx.summary.urls_already_r2 += 1;
      return value;
    }

    const ensure = await ensureR2Object({
      objectPath: r2ObjectPath,
      sourceUrl: trimmed,
      dryRun: ctx.dryRun,
      objectChecks: ctx.objectChecks,
      summary: ctx.summary,
      table: ctx.table,
      rowId: ctx.rowId,
      rowLabel: ctx.rowLabel,
      field,
    });

    if (ensure.error) {
      throw new Error(`${field}: ${ensure.error}`);
    }

    mappedCount += 1;
    ctx.summary.urls_mapped += 1;
    if (ensure.reuploaded) reuploadedCount += 1;
    if (ensure.exists && !ensure.reuploaded) ctx.summary.urls_r2_exists += 1;

    return nextUrl;
  }

  async function mapText(value, field) {
    if (typeof value !== "string") return value;
    if (
      !value.includes("/storage/v1/object/public/") &&
      !containsLegacyCdnUrl(value)
    ) {
      return value;
    }

    const candidates = extractHttpUrls(value);
    let next = value;

    for (const url of candidates) {
      const isSupabase = url.includes("/storage/v1/object/public/");
      const isLegacy = Boolean(parseLegacyCdnUrl(url));
      if (!isSupabase && !isLegacy) continue;
      const mapped = await mapUrl(url, field);
      if (mapped !== url) {
        next = next.split(url).join(mapped);
      }
    }

    return next;
  }

  return {
    mapUrl,
    mapText,
    bucket: ctx.bucket,
    r2PublicUrl: ctx.r2PublicUrl,
    pathMode: ctx.pathMode,
    stats() {
      return { mappedCount, reuploadedCount, hadSupabaseUrls };
    },
  };
}

async function mapBlogReference(reference, tracker) {
  const base =
    reference && typeof reference === "object" && !Array.isArray(reference)
      ? { ...reference }
      : { uploaded: [] };

  const uploaded = Array.isArray(base.uploaded) ? base.uploaded : [];
  const nextUploaded = [];

  for (const [index, asset] of uploaded.entries()) {
    if (!asset || typeof asset !== "object") {
      nextUploaded.push(asset);
      continue;
    }

    const originalPublicUrl = asset.publicUrl;
    const publicUrl = await tracker.mapUrl(
      originalPublicUrl,
      `reference.uploaded[${index}].publicUrl`,
    );

    let assetPath = asset.path;
    const parsedFromOriginal =
      parseSupabaseStorageUrl(String(originalPublicUrl ?? ""), tracker.bucket) ??
      parseLegacyCdnUrl(String(originalPublicUrl ?? ""));
    if (parsedFromOriginal) {
      assetPath = toR2ObjectPath(parsedFromOriginal.objectPath, tracker.pathMode);
    } else if (isAlreadyR2Url(String(publicUrl ?? ""), tracker.r2PublicUrl)) {
      assetPath =
        objectPathFromR2PublicUrl(publicUrl, tracker.r2PublicUrl) ?? assetPath;
    }

    nextUploaded.push({
      ...asset,
      publicUrl,
      path: assetPath,
    });
  }

  return { ...base, uploaded: nextUploaded };
}

async function mapEmailReference(reference, tracker) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    return reference ?? {};
  }

  const next = {};
  for (const [key, value] of Object.entries(reference)) {
    if (typeof value === "string") {
      next[key] = await tracker.mapUrl(value, `reference.${key}`);
    } else {
      next[key] = value;
    }
  }
  return next;
}

async function mapStringArray(values, field, tracker) {
  if (!Array.isArray(values)) return values ?? [];
  const next = [];
  for (const [index, value] of values.entries()) {
    if (typeof value === "string") {
      next.push(await tracker.mapText(value, `${field}[${index}]`));
    } else {
      next.push(value);
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
  table,
  rowId,
  rowLabel,
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

        const special = {
          table,
          row_id: rowId,
          row_label: rowLabel,
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
            `MISSING ON R2 — would re-upload ${table} ${rowId} ${field}: ${sourceUrl} → ${objectPath}`,
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
            `MISSING ON R2 — re-uploaded ${table} ${rowId} ${field}: ${sourceUrl} → ${objectPath} (${downloaded.buffer.byteLength} bytes, ${downloaded.contentType})`,
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
            `MISSING ON R2 — FAILED ${table} ${rowId} ${field}: ${sourceUrl} → ${objectPath}: ${message}`,
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
    headerType.split(";")[0].trim() ||
    mimeTypeForPath(url) ||
    "application/octet-stream";
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
    const raw =
      value.slice(normalizedBase.length).replace(/^\/+/, "").split("?")[0] ?? "";
    if (!raw) return null;
    try {
      return {
        objectPath: normalizeObjectKey(decodeURIComponent(raw)),
        source: "legacy_cdn",
      };
    } catch {
      return { objectPath: normalizeObjectKey(raw), source: "legacy_cdn" };
    }
  }

  return null;
}

function containsLegacyCdnUrl(value) {
  if (typeof value !== "string") return false;
  return LEGACY_CDN_BASES.some((base) => value.includes(base.replace(/^https?:\/\//i, "")));
}

function toR2ObjectPath(supabaseObjectPath, pathMode) {
  const objectPath = normalizeObjectKey(supabaseObjectPath);
  if (pathMode === "products_prefix") {
    if (objectPath.startsWith("products/")) return objectPath;
    return `products/${objectPath}`;
  }
  return objectPath;
}

function isAlreadyR2Url(value, r2PublicUrl) {
  const base = String(r2PublicUrl ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!base) return false;
  return value.startsWith(`${base}/`);
}

function objectPathFromR2PublicUrl(publicUrl, r2PublicUrl) {
  const base = String(r2PublicUrl ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!base || typeof publicUrl !== "string" || !publicUrl.startsWith(`${base}/`)) {
    return null;
  }
  return normalizeObjectKey(publicUrl.slice(base.length).split("?")[0] ?? "");
}

function extractHttpUrls(text) {
  const matches = String(text).match(/https?:\/\/[^\s"'<>\\]+/g) ?? [];
  const urls = [];
  const seen = new Set();
  for (const raw of matches) {
    const url = raw.replace(/[),.;]+$/g, "");
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

async function fetchAllRows(supabase, config) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(config.name)
      .select(config.select)
      .order(config.orderColumn, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${config.name} select failed: ${error.message}`);
    }

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

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function parseArgs(inputArgs) {
  const result = {
    dryRun: !inputArgs.includes("--apply"),
    tables: [...ALL_TABLES],
    limit: null,
  };

  for (const arg of inputArgs) {
    if (arg === "--dry-run") result.dryRun = true;
    if (arg === "--apply") result.dryRun = false;
    if (arg.startsWith("--tables=")) {
      const values = arg
        .slice("--tables=".length)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const unknown = values.filter((name) => !ALL_TABLES.includes(name));
      if (unknown.length) {
        throw new Error(
          `Unknown table(s): ${unknown.join(", ")}. Allowed: ${ALL_TABLES.join(", ")}`,
        );
      }
      result.tables = values.length ? values : [...ALL_TABLES];
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
