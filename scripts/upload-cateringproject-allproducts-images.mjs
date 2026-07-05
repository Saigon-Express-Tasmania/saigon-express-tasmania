#!/usr/bin/env node
/**
 * Upload Catering Project allproducts.json local images to Supabase Storage.
 *
 * Reads per category:
 *   refs/cateringproject/htmls/<category-slug>/allproducts.json
 *   refs/cateringproject/htmls/<category-slug>/images/<product-slug>/*
 *
 * Uploads each local image to:
 *   catering-packs/<product-slug>/<filename>
 *
 * Patches allproducts.json image_urls / image_url with Supabase public URLs.
 * Products whose image_url already points at Supabase Storage are skipped entirely.
 *
 * Usage:
 *   node scripts/upload-cateringproject-allproducts-images.mjs
 *   node scripts/upload-cateringproject-allproducts-images.mjs --category-slugs=afternoon-tea-disposables
 *   node scripts/upload-cateringproject-allproducts-images.mjs --category refs/cateringproject/htmls/afternoon-tea-disposables
 *   node scripts/upload-cateringproject-allproducts-images.mjs --dry-run
 *   node scripts/upload-cateringproject-allproducts-images.mjs --skip-uploaded
 *
 * Env (from .env / .env.local):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_HTML_ROOT = path.join(root, "refs/cateringproject/htmls");
const BUCKET = "saigon-express-tasmania";
const FOLDER = "catering-packs";

const args = process.argv.slice(2);
const options = parseArgs(args);
const htmlRoot = path.resolve(root, options.htmlRoot);
const dryRun = options.dryRun;

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});

async function main() {
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!dryRun && !serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (or pass --dry-run)");
  }

  const supabase = serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  const categoryFolders = resolveCategoryFolders();
  const batchSummary = {
    generated_at: new Date().toISOString(),
    html_root: htmlRoot,
    bucket: BUCKET,
    folder: FOLDER,
    dry_run: dryRun,
    skip_uploaded: options.skipUploaded,
    categories: [],
  };

  console.log(
    `${dryRun ? "Dry run" : "Uploading"} images for ${categoryFolders.length} categories...`,
  );

  for (const [index, categoryFolder] of categoryFolders.entries()) {
    const categorySlug = path.basename(categoryFolder);
    const allProductsPath = path.join(categoryFolder, "allproducts.json");

    if (!fs.existsSync(allProductsPath)) {
      console.warn(
        `[${index + 1}/${categoryFolders.length}] ${categorySlug} skipped (missing allproducts.json)`,
      );
      continue;
    }

    const products = readJson(allProductsPath);
    if (!Array.isArray(products)) {
      throw new Error(`${allProductsPath} must be a JSON array`);
    }

    const stats = {
      products: products.length,
      products_skipped: 0,
      uploaded: 0,
      skipped: 0,
      failed: 0,
      already_remote: 0,
    };

    for (const product of products) {
      if (isSupabasePublicUrl(product.image_url)) {
        stats.products_skipped += 1;
        continue;
      }

      const productStats = await patchProductImages({
        product,
        categoryFolder,
        supabase,
        supabaseUrl,
      });
      stats.uploaded += productStats.uploaded;
      stats.skipped += productStats.skipped;
      stats.failed += productStats.failed;
      stats.already_remote += productStats.already_remote;
    }

    if (!dryRun) {
      fs.writeFileSync(allProductsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
    }

    batchSummary.categories.push({
      category_slug: categorySlug,
      allproducts_path: allProductsPath,
      stats,
    });

    console.log(
      `[${index + 1}/${categoryFolders.length}] ${categorySlug} patched ${products.length - stats.products_skipped} products (${stats.products_skipped} already on supabase, ${stats.uploaded} uploaded, ${stats.skipped} skipped, ${stats.failed} failed)`,
    );
  }

  fs.writeFileSync(
    path.join(htmlRoot, "_allproducts-upload-summary.json"),
    `${JSON.stringify(batchSummary, null, 2)}\n`,
    "utf8",
  );
}

function parseArgs(inputArgs) {
  const result = {
    htmlRoot: relativize(DEFAULT_HTML_ROOT),
    categoryPath: null,
    categorySlugs: null,
    dryRun: false,
    skipUploaded: false,
  };

  for (const arg of inputArgs) {
    if (arg.startsWith("--html-root=")) {
      result.htmlRoot = arg.slice("--html-root=".length);
    } else if (arg.startsWith("--category-slugs=")) {
      const values = arg
        .slice("--category-slugs=".length)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      result.categorySlugs = values.length ? new Set(values) : null;
    } else if (arg.startsWith("--category=")) {
      result.categoryPath = arg.slice("--category=".length);
    } else if (arg === "--category" && inputArgs[inputArgs.indexOf(arg) + 1]) {
      result.categoryPath = inputArgs[inputArgs.indexOf(arg) + 1];
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    } else if (arg === "--skip-uploaded") {
      result.skipUploaded = true;
    }
  }

  return result;
}

function resolveCategoryFolders() {
  if (options.categoryPath) {
    return [path.resolve(root, options.categoryPath)];
  }

  return fs
    .readdirSync(htmlRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("."))
    .filter((name) => !options.categorySlugs || options.categorySlugs.has(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(htmlRoot, name));
}

async function patchProductImages({ product, categoryFolder, supabase, supabaseUrl }) {
  const stats = { uploaded: 0, skipped: 0, failed: 0, already_remote: 0 };
  const slug = inferProductSlug(product);
  if (!slug) return stats;

  const localToPublic = new Map();

  async function resolvePath(localRelativePath) {
    if (!localRelativePath) return localRelativePath;

    if (isSupabasePublicUrl(localRelativePath)) {
      stats.already_remote += 1;
      return localRelativePath;
    }

    if (!isLocalImagePath(localRelativePath)) {
      return localRelativePath;
    }

    if (localToPublic.has(localRelativePath)) {
      return localToPublic.get(localRelativePath);
    }

    const fileName = path.basename(localRelativePath);
    const objectPath = `${FOLDER}/${slug}/${fileName}`;

    if (options.skipUploaded) {
      const exists = await storageObjectExists(supabase, objectPath);
      if (exists) {
        const url = buildPublicUrl(supabaseUrl, objectPath);
        localToPublic.set(localRelativePath, url);
        stats.skipped += 1;
        return url;
      }
    }

    try {
      const url = dryRun
        ? buildPublicUrl(supabaseUrl, objectPath)
        : await uploadLocalFile({
            supabase,
            supabaseUrl,
            categoryFolder,
            localRelativePath,
            objectPath,
          });
      localToPublic.set(localRelativePath, url);
      stats.uploaded += 1;
      return url;
    } catch (error) {
      stats.failed += 1;
      console.warn(
        `  ${slug}: upload failed (${localRelativePath}): ${String(error?.message || error)}`,
      );
      return localRelativePath;
    }
  }

  const originalImageUrls = product.image_urls ?? {};
  const patchedImageUrls = {};

  for (const [key, value] of Object.entries(originalImageUrls)) {
    if (key === "more") continue;
    if (typeof value === "string") {
      patchedImageUrls[key] = await resolvePath(value);
    }
  }

  if (Array.isArray(originalImageUrls.more)) {
    patchedImageUrls.more = [];
    for (const entry of originalImageUrls.more) {
      patchedImageUrls.more.push({
        sm: await resolvePath(entry.sm),
        lg: await resolvePath(entry.lg),
      });
    }
  }

  if (Object.keys(patchedImageUrls).length) {
    product.image_urls = patchedImageUrls;
  }

  product.image_url =
    (await resolvePath(product.image_url)) ??
    patchedImageUrls["1920"] ??
    patchedImageUrls["1024"] ??
    patchedImageUrls["512"] ??
    patchedImageUrls["256"] ??
    product.image_url ??
    null;

  return stats;
}

async function uploadLocalFile({
  supabase,
  supabaseUrl,
  categoryFolder,
  localRelativePath,
  objectPath,
}) {
  const absolutePath = path.join(categoryFolder, localRelativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`missing local file: ${localRelativePath}`);
  }

  const buffer = fs.readFileSync(absolutePath);
  const contentType = mimeTypeForPath(absolutePath);

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    upsert: true,
    contentType,
    cacheControl: "31536000",
  });

  if (error) {
    throw new Error(`${objectPath}: ${error.message}`);
  }

  return buildPublicUrl(supabaseUrl, objectPath);
}

async function storageObjectExists(supabase, objectPath) {
  if (!supabase || dryRun) return false;

  const folder = path.posix.dirname(objectPath);
  const fileName = path.posix.basename(objectPath);
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    search: fileName,
    limit: 1,
  });

  if (error) return false;
  return (data ?? []).some((item) => item.name === fileName);
}

function inferProductSlug(product) {
  const urls = product.image_urls ?? {};

  for (const key of ["256", "512", "1024", "1920"]) {
    const candidate = urls[key];
    const slug = slugFromLocalImagePath(candidate);
    if (slug) return slug;
  }

  const fromImageUrl = slugFromLocalImagePath(product.image_url);
  if (fromImageUrl) return fromImageUrl;

  if (Array.isArray(urls.more)) {
    for (const entry of urls.more) {
      const slug = slugFromLocalImagePath(entry.sm) ?? slugFromLocalImagePath(entry.lg);
      if (slug) return slug;
    }
  }

  if (typeof product.sku === "string" && product.sku.startsWith("CP-")) {
    return product.sku
      .slice(3)
      .toLowerCase()
      .replace(/_/g, "-");
  }

  return slugFromName(product.name);
}

function slugFromLocalImagePath(value) {
  if (!isLocalImagePath(value)) return null;
  const parts = value.split("/").filter(Boolean);
  return parts.length >= 2 ? parts[1] : null;
}

function slugFromName(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isLocalImagePath(value) {
  return typeof value === "string" && value.startsWith("images/");
}

function isSupabasePublicUrl(value) {
  return (
    typeof value === "string" &&
    /^https?:\/\//i.test(value) &&
    value.includes("/storage/v1/object/public/")
  );
}

function buildPublicUrl(supabaseUrl, objectPath) {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${objectPath}`;
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
      return "application/octet-stream";
  }
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function relativize(absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/");
}
