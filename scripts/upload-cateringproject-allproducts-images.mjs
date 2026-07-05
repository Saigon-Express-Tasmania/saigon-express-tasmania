#!/usr/bin/env node
/**
 * Upload Catering Project local images to Supabase Storage.
 *
 * Reads the deduplicated catalog:
 *   refs/cateringproject/htmls/totalproducts.json
 *
 * Local image files are resolved from prefixed paths in totalproducts.json, e.g.:
 *   refs/cateringproject/htmls/<category-slug>/images/<product-slug>/*
 *
 * Uploads each local image once per product slug, then patches image_urls /
 * image_url in totalproducts.json only (category allproducts.json is not modified).
 *
 * Uploads run concurrently in batches of 10.
 *   catering-packs/<product-slug>/<filename>
 *
 * Patches totalproducts.json image_urls / image_url with Supabase public URLs.
 * Products with no remaining local image paths are skipped.
 *
 * Requires totalproducts.json (run merge-cateringproject-allproducts.mjs first).
 *
 * Optional --category / --category-slugs filter which totalproducts.json rows
 * are processed (matched via _source.category_slugs). Category allproducts.json
 * files are never read or written.
 *
 * Usage:
 *   node scripts/upload-cateringproject-allproducts-images.mjs
 *   node scripts/upload-cateringproject-allproducts-images.mjs --category-slugs=afternoon-tea-disposables
 *   node scripts/upload-cateringproject-allproducts-images.mjs --category refs/cateringproject/htmls/afternoon-tea-disposables
 *   node scripts/upload-cateringproject-allproducts-images.mjs --dry-run
 *   node scripts/upload-cateringproject-allproducts-images.mjs --skip-uploaded
 *
 * Dry run (--dry-run):
 *   - Does not upload to Supabase Storage or write totalproducts.json
 *   - Scans local images, counts sizes/bytes, and reports planned uploads + JSON patches
 *
 * Env (from .env / .env.local):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  inferProductSlug,
  isPrefixedLocalImagePath,
} from "./lib/cateringproject-product-slug.mjs";
import {
  BUCKET,
  FOLDER,
  buildPublicUrl,
  isSupabasePublicUrl,
  parseSupabaseObjectPath,
} from "./lib/cateringproject-supabase-images.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_HTML_ROOT = path.join(root, "refs/cateringproject/htmls");
const UPLOAD_BATCH_SIZE = 10;

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
  const reportSupabaseUrl = supabaseUrl ?? "https://<SUPABASE_URL>";

  if (!supabaseUrl && !dryRun) {
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

  const totalProductsPath = path.join(htmlRoot, "totalproducts.json");
  if (!fs.existsSync(totalProductsPath)) {
    throw new Error(
      `Missing ${relativize(totalProductsPath)}. Run: node scripts/merge-cateringproject-allproducts.mjs`,
    );
  }

  const allTotalProducts = readJson(totalProductsPath);
  if (!Array.isArray(allTotalProducts)) {
    throw new Error(`${totalProductsPath} must be a JSON array`);
  }

  const totalProducts = filterTotalProducts(allTotalProducts);
  const registry = createUploadRegistry(totalProducts);

  const batchSummary = {
    generated_at: new Date().toISOString(),
    html_root: htmlRoot,
    totalproducts_path: totalProductsPath,
    products_in_file: allTotalProducts.length,
    products_selected: totalProducts.length,
    registry_seeded_urls: registry.size(),
    upload_batch_size: UPLOAD_BATCH_SIZE,
    bucket: BUCKET,
    folder: FOLDER,
    dry_run: dryRun,
    skip_uploaded: options.skipUploaded,
    totals: emptyRunTotals(),
    totalproducts: null,
  };

  console.log(
    `${dryRun ? "Dry run" : "Uploading"} images for ${totalProducts.length} products (${registry.size()} URLs in registry)...`,
  );

  const totalProductsReport = {
    label: "totalproducts.json",
    json_path: totalProductsPath,
    stats: emptyRunTotals(),
    products: [],
  };

  await processProductFile({
    products: totalProducts,
    categoryFolder: htmlRoot,
    htmlRoot,
    supabase,
    supabaseUrl: reportSupabaseUrl,
    registry,
    dryRun,
    stats: totalProductsReport.stats,
    productDetails: totalProductsReport.products,
  });

  if (!dryRun) {
    fs.writeFileSync(
      totalProductsPath,
      `${JSON.stringify(allTotalProducts, null, 2)}\n`,
      "utf8",
    );
  }

  mergeRunTotals(batchSummary.totals, totalProductsReport.stats);
  batchSummary.totalproducts = totalProductsReport;

  logProgress({
    label: "totalproducts.json",
    stats: totalProductsReport.stats,
    dryRun,
  });

  const summaryPath = path.join(
    htmlRoot,
    dryRun ? "_allproducts-upload-dry-run-summary.json" : "_allproducts-upload-summary.json",
  );
  fs.writeFileSync(summaryPath, `${JSON.stringify(batchSummary, null, 2)}\n`, "utf8");
  printBatchSummary(batchSummary, summaryPath);
}

function filterTotalProducts(products) {
  const categorySlug = options.categorySlug;
  if (!options.categorySlugs && !categorySlug) return products;

  const allowedSlugs = options.categorySlugs ?? new Set([categorySlug]);

  return products.filter((product) => {
    const slugs = product._source?.category_slugs ?? [];
    return slugs.some((slug) => allowedSlugs.has(slug));
  });
}

function parseArgs(inputArgs) {
  const result = {
    htmlRoot: relativize(DEFAULT_HTML_ROOT),
    categoryPath: null,
    categorySlug: null,
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

  if (result.categoryPath) {
    result.categorySlug = path.basename(path.resolve(root, result.categoryPath));
  }

  return result;
}

async function processProductFile({
  products,
  categoryFolder,
  htmlRoot,
  supabase,
  supabaseUrl,
  registry,
  dryRun,
  stats,
  productDetails,
}) {
  stats.products_total = products.length;

  if (dryRun) {
    for (const product of products) {
      if (!hasLocalImagePaths(product)) {
        stats.products_skipped_remote += 1;
        if (productDetails) {
          productDetails.push({
            product_slug: getProductSlug(product),
            product_name: product.name ?? null,
            status: "skipped_no_local_images",
            image_url: product.image_url ?? null,
          });
        }
        continue;
      }

      const plan = planProductImages({
        product,
        categoryFolder,
        htmlRoot,
        supabaseUrl,
        registry,
      });
      mergeRunTotals(stats, plan.stats);
      if (productDetails) productDetails.push(plan);
    }
    return;
  }

  const productsToPatch = [];
  const uploadJobsByObjectPath = new Map();

  for (const product of products) {
    if (!hasLocalImagePaths(product)) {
      stats.products_skipped_remote += 1;
      continue;
    }

    const prepared = prepareProductImagePatches({
      product,
      categoryFolder,
      htmlRoot,
      registry,
    });
    if (!prepared) continue;

    mergeRunTotals(stats, prepared.stats);
    productsToPatch.push(prepared);

    for (const job of prepared.uploadJobs) {
      if (!uploadJobsByObjectPath.has(job.objectPath)) {
        uploadJobsByObjectPath.set(job.objectPath, job);
      }
    }
  }

  const uploadJobs = [...uploadJobsByObjectPath.values()];

  if (options.skipUploaded) {
    for (const job of uploadJobs) {
      const exists = await storageObjectExists(supabase, job.objectPath);
      if (exists) {
        registry.remember(job.objectPath, buildPublicUrl(supabaseUrl, job.objectPath));
        uploadJobsByObjectPath.delete(job.objectPath);
        stats.uploads_skipped_existing += 1;
      }
    }
  }

  const pendingUploads = [...uploadJobsByObjectPath.values()];
  const uploadStats = await runUploadsInBatches({
    jobs: pendingUploads,
    batchSize: UPLOAD_BATCH_SIZE,
    supabase,
    supabaseUrl,
    htmlRoot,
    registry,
  });
  mergeRunTotals(stats, uploadStats);

  for (const prepared of productsToPatch) {
    applyProductImagePatches({
      product: prepared.product,
      slug: prepared.slug,
      categoryFolder: prepared.categoryFolder,
      htmlRoot: prepared.htmlRoot,
      registry: prepared.registry,
    });
  }
}

function createUploadRegistry(totalProducts) {
  const objectPathToUrl = new Map();

  function store(objectPath, url) {
    if (objectPath && url) objectPathToUrl.set(objectPath, url);
  }

  function seedFromValue(value) {
    if (!isSupabasePublicUrl(value)) return;
    const parsed = parseSupabaseObjectPath(value);
    if (parsed) store(parsed.objectPath, value);
  }

  function seedFromProduct(product) {
    const urls = product.image_urls ?? {};

    for (const key of ["256", "512", "1024", "1920"]) {
      seedFromValue(urls[key]);
    }

    if (Array.isArray(urls.more)) {
      for (const entry of urls.more) {
        seedFromValue(entry.sm);
        seedFromValue(entry.lg);
      }
    }

    seedFromValue(product.image_url);
  }

  for (const product of totalProducts) {
    seedFromProduct(product);
  }

  return {
    getUrl(objectPath) {
      return objectPathToUrl.get(objectPath) ?? null;
    },
    remember: store,
    size() {
      return objectPathToUrl.size;
    },
  };
}

function getProductSlug(product) {
  return product.product_slug ?? inferProductSlug(product);
}

function hasLocalImagePaths(product) {
  const urls = product.image_urls ?? {};

  for (const key of ["256", "512", "1024", "1920"]) {
    if (isLocalImagePath(urls[key])) return true;
  }

  if (isLocalImagePath(product.image_url)) return true;

  if (Array.isArray(urls.more)) {
    for (const entry of urls.more) {
      if (isLocalImagePath(entry.sm) || isLocalImagePath(entry.lg)) return true;
    }
  }

  return false;
}

function isLocalImagePath(value) {
  return (
    typeof value === "string" &&
    (value.startsWith("images/") || isPrefixedLocalImagePath(value))
  );
}

function resolveLocalAbsolutePath(localRelativePath, categoryFolder, htmlRoot) {
  if (isPrefixedLocalImagePath(localRelativePath)) {
    return path.join(htmlRoot, localRelativePath);
  }

  return path.join(categoryFolder, localRelativePath);
}

function emptyRunTotals() {
  return {
    products_total: 0,
    products_to_patch: 0,
    products_skipped_remote: 0,
    uploads_planned: 0,
    uploads_uploaded: 0,
    uploads_skipped_existing: 0,
    uploads_deduplicated: 0,
    uploads_failed: 0,
    refs_already_remote: 0,
    refs_unchanged: 0,
    missing_local_files: 0,
    bytes_to_upload: 0,
    size_variant_counts: {},
    extension_counts: {},
  };
}

function mergeRunTotals(target, source) {
  if (!source) return;

  target.products_total += source.products_total ?? 0;
  target.products_to_patch += source.products_to_patch ?? 0;
  target.products_skipped_remote +=
    source.products_skipped_remote ?? source.products_skipped ?? 0;
  target.uploads_planned += source.uploads_planned ?? 0;
  target.uploads_uploaded += source.uploads_uploaded ?? source.uploaded ?? 0;
  target.uploads_skipped_existing +=
    source.uploads_skipped_existing ?? source.skipped ?? 0;
  target.uploads_deduplicated += source.uploads_deduplicated ?? 0;
  target.uploads_failed += source.uploads_failed ?? source.failed ?? 0;
  target.refs_already_remote +=
    source.refs_already_remote ?? source.already_remote ?? 0;
  target.refs_unchanged += source.refs_unchanged ?? 0;
  target.missing_local_files += source.missing_local_files ?? 0;
  target.bytes_to_upload += source.bytes_to_upload ?? 0;

  for (const [key, count] of Object.entries(source.size_variant_counts ?? {})) {
    target.size_variant_counts[key] =
      (target.size_variant_counts[key] ?? 0) + count;
  }
  for (const [key, count] of Object.entries(source.extension_counts ?? {})) {
    target.extension_counts[key] = (target.extension_counts[key] ?? 0) + count;
  }
}

function planProductImages({ product, categoryFolder, htmlRoot, supabaseUrl, registry }) {
  const slug = getProductSlug(product);
  const stats = emptyRunTotals();
  const uploads = [];
  const jsonPatches = [];
  const seenLocalPaths = new Set();

  if (!slug) {
    return {
      product_slug: null,
      product_name: product.name ?? null,
      status: "skipped_no_slug",
      stats,
      uploads,
      json_patches: jsonPatches,
    };
  }

  stats.products_to_patch = 1;

  function planPath(field, localRelativePath) {
    if (!localRelativePath) return localRelativePath;

    if (isSupabasePublicUrl(localRelativePath)) {
      stats.refs_already_remote += 1;
      return localRelativePath;
    }

    if (!isLocalImagePath(localRelativePath)) {
      stats.refs_unchanged += 1;
      return localRelativePath;
    }

    const publicUrl = planLocalUpload({
      localRelativePath,
      slug,
      categoryFolder,
      htmlRoot,
      supabaseUrl,
      stats,
      uploads,
      seenLocalPaths,
      registry,
    });

    if (publicUrl !== localRelativePath) {
      jsonPatches.push({
        field,
        from: localRelativePath,
        to: publicUrl,
      });
    }

    return publicUrl;
  }

  const originalImageUrls = product.image_urls ?? {};
  const plannedImageUrls = {};

  for (const [key, value] of Object.entries(originalImageUrls)) {
    if (key === "more") continue;
    if (typeof value === "string") {
      plannedImageUrls[key] = planPath(`image_urls.${key}`, value);
    }
  }

  if (Array.isArray(originalImageUrls.more)) {
    plannedImageUrls.more = [];
    for (const [index, entry] of originalImageUrls.more.entries()) {
      plannedImageUrls.more.push({
        sm: planPath(`image_urls.more[${index}].sm`, entry.sm),
        lg: planPath(`image_urls.more[${index}].lg`, entry.lg),
      });
    }
  }

  const plannedImageUrl =
    planPath("image_url", product.image_url) ??
    plannedImageUrls["1920"] ??
    plannedImageUrls["1024"] ??
    plannedImageUrls["512"] ??
    plannedImageUrls["256"] ??
    product.image_url ??
    null;

  if (
    Object.keys(plannedImageUrls).length &&
    JSON.stringify(plannedImageUrls) !== JSON.stringify(originalImageUrls)
  ) {
    jsonPatches.push({
      field: "image_urls",
      from: originalImageUrls,
      to: plannedImageUrls,
    });
  }

  if (plannedImageUrl !== product.image_url) {
    jsonPatches.push({
      field: "image_url",
      from: product.image_url ?? null,
      to: plannedImageUrl,
    });
  }

  return {
    product_slug: slug,
    product_name: product.name ?? null,
    status: jsonPatches.length ? "planned" : "no_changes",
    stats,
    uploads,
    json_patches: jsonPatches,
  };
}

function planLocalUpload({
  localRelativePath,
  slug,
  categoryFolder,
  htmlRoot,
  supabaseUrl,
  stats,
  uploads,
  seenLocalPaths,
  registry,
}) {
  if (seenLocalPaths.has(localRelativePath)) {
    const existing = uploads.find((item) => item.local_path === localRelativePath);
    return (
      existing?.public_url ??
      buildPublicUrl(supabaseUrl, `${FOLDER}/${slug}/${path.basename(localRelativePath)}`)
    );
  }
  seenLocalPaths.add(localRelativePath);

  const fileName = path.basename(localRelativePath);
  const objectPath = `${FOLDER}/${slug}/${fileName}`;
  const cachedUrl = registry.getUrl(objectPath);
  if (cachedUrl) {
    stats.uploads_deduplicated += 1;
    return cachedUrl;
  }

  const absolutePath = resolveLocalAbsolutePath(
    localRelativePath,
    categoryFolder,
    htmlRoot,
  );
  const exists = fs.existsSync(absolutePath);
  const sizeBytes = exists ? fs.statSync(absolutePath).size : 0;
  const contentType = mimeTypeForPath(absolutePath);
  const extension = path.extname(fileName).toLowerCase() || "(none)";
  const sizeVariant = inferSizeVariant(fileName, localRelativePath);

  if (!exists) {
    stats.missing_local_files += 1;
  }

  stats.uploads_planned += 1;
  stats.bytes_to_upload += sizeBytes;
  stats.size_variant_counts[sizeVariant] =
    (stats.size_variant_counts[sizeVariant] ?? 0) + 1;
  stats.extension_counts[extension] =
    (stats.extension_counts[extension] ?? 0) + 1;

  const publicUrl = buildPublicUrl(supabaseUrl, objectPath);
  registry.remember(objectPath, publicUrl);
  uploads.push({
    local_path: localRelativePath,
    absolute_path: absolutePath,
    object_path: objectPath,
    public_url: publicUrl,
    size_bytes: sizeBytes,
    size_variant: sizeVariant,
    content_type: contentType,
    missing_local_file: !exists,
  });

  return publicUrl;
}

function inferSizeVariant(fileName, localRelativePath) {
  const fromName = fileName.match(/_(\d+)\.[^.]+$/);
  if (fromName) return fromName[1];

  const parts = localRelativePath.split("/").filter(Boolean);
  if (parts.length >= 3) {
    const variantDir = parts[2];
    if (/^\d+$/.test(variantDir)) return variantDir;
  }

  return "unknown";
}

function logProgress({ label, stats, dryRun }) {
  if (dryRun) {
    console.log(
      `${label} plan: ${stats.products_to_patch} products to patch, ${stats.products_skipped_remote} already remote, ${stats.uploads_planned} uploads (${formatBytes(stats.bytes_to_upload)}), ${stats.uploads_deduplicated} deduplicated, ${stats.missing_local_files} missing files`,
    );
    return;
  }

  console.log(
    `${label} patched ${stats.products_to_patch} products (${stats.products_skipped_remote} already remote, ${stats.uploads_uploaded} uploaded, ${stats.uploads_deduplicated} deduplicated, ${stats.uploads_skipped_existing} skipped, ${stats.uploads_failed} failed)`,
  );
}

function printBatchSummary(batchSummary, summaryPath) {
  const { totals, dry_run: dryRun } = batchSummary;

  console.log("");
  console.log(dryRun ? "=== Dry run summary ===" : "=== Upload summary ===");
  console.log(`Products in totalproducts.json: ${batchSummary.products_in_file}`);
  if (batchSummary.products_selected !== batchSummary.products_in_file) {
    console.log(`Products selected: ${batchSummary.products_selected}`);
  }
  console.log(`Products to patch: ${totals.products_to_patch}`);
  console.log(`Products already on Supabase: ${totals.products_skipped_remote}`);

  if (dryRun) {
    console.log(`Uploads planned: ${totals.uploads_planned}`);
    console.log(`Uploads deduplicated (registry): ${totals.uploads_deduplicated}`);
    console.log(`Total upload size: ${formatBytes(totals.bytes_to_upload)}`);
    console.log(`Missing local files: ${totals.missing_local_files}`);
    console.log(`Image refs already remote: ${totals.refs_already_remote}`);
    console.log(`Image refs unchanged: ${totals.refs_unchanged}`);
    console.log(
      `Size variants: ${formatCountMap(totals.size_variant_counts) || "(none)"}`,
    );
    console.log(
      `Extensions: ${formatCountMap(totals.extension_counts) || "(none)"}`,
    );
    console.log("No files were uploaded and totalproducts.json was not modified.");
  } else {
    console.log(`Uploads completed: ${totals.uploads_uploaded}`);
    console.log(`Uploads deduplicated (registry): ${totals.uploads_deduplicated}`);
    console.log(`Uploads skipped (already in bucket): ${totals.uploads_skipped_existing}`);
    console.log(`Upload failures: ${totals.uploads_failed}`);
    console.log(`Image refs already remote: ${totals.refs_already_remote}`);
  }

  console.log(`Report written to: ${summaryPath}`);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatCountMap(map) {
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([key, count]) => `${key}=${count}`)
    .join(", ");
}

function collectProductImagePaths(product) {
  const paths = [];
  const urls = product.image_urls ?? {};

  for (const key of ["256", "512", "1024", "1920"]) {
    if (typeof urls[key] === "string") paths.push(urls[key]);
  }

  if (typeof product.image_url === "string") paths.push(product.image_url);

  if (Array.isArray(urls.more)) {
    for (const entry of urls.more) {
      if (typeof entry.sm === "string") paths.push(entry.sm);
      if (typeof entry.lg === "string") paths.push(entry.lg);
    }
  }

  return paths;
}

function createImagePathResolver({
  slug,
  categoryFolder,
  htmlRoot,
  registry,
  stats,
  uploadJobs,
  collectUploads,
}) {
  const localToPublic = new Map();

  function resolvePath(localRelativePath) {
    if (!localRelativePath) return localRelativePath;

    if (isSupabasePublicUrl(localRelativePath)) {
      stats.refs_already_remote += 1;
      return localRelativePath;
    }

    if (!isLocalImagePath(localRelativePath)) {
      stats.refs_unchanged += 1;
      return localRelativePath;
    }

    if (localToPublic.has(localRelativePath)) {
      return localToPublic.get(localRelativePath);
    }

    const fileName = path.basename(localRelativePath);
    const objectPath = `${FOLDER}/${slug}/${fileName}`;

    const cachedUrl = registry.getUrl(objectPath);
    if (cachedUrl) {
      localToPublic.set(localRelativePath, cachedUrl);
      stats.uploads_deduplicated += 1;
      return cachedUrl;
    }

    if (collectUploads) {
      if (!localToPublic.has(localRelativePath)) {
        uploadJobs.push({
          localRelativePath,
          objectPath,
          categoryFolder,
          slug,
        });
        localToPublic.set(localRelativePath, localRelativePath);
      }
      return localRelativePath;
    }

    return localRelativePath;
  }

  return resolvePath;
}

function prepareProductImagePatches({ product, categoryFolder, htmlRoot, registry }) {
  const stats = emptyRunTotals();
  const slug = getProductSlug(product);
  if (!slug) return null;

  stats.products_to_patch = 1;
  const uploadJobs = [];
  const resolvePath = createImagePathResolver({
    slug,
    categoryFolder,
    htmlRoot,
    registry,
    stats,
    uploadJobs,
    collectUploads: true,
  });

  for (const localPath of collectProductImagePaths(product)) {
    resolvePath(localPath);
  }

  return {
    product,
    slug,
    categoryFolder,
    htmlRoot,
    registry,
    stats,
    uploadJobs,
  };
}

function applyProductImagePatches({ product, slug, categoryFolder, htmlRoot, registry }) {
  const stats = emptyRunTotals();
  const resolvePath = createImagePathResolver({
    slug,
    categoryFolder,
    htmlRoot,
    registry,
    stats,
    uploadJobs: [],
    collectUploads: false,
  });

  const originalImageUrls = product.image_urls ?? {};
  const patchedImageUrls = {};

  for (const [key, value] of Object.entries(originalImageUrls)) {
    if (key === "more") continue;
    if (typeof value === "string") {
      patchedImageUrls[key] = resolvePath(value);
    }
  }

  if (Array.isArray(originalImageUrls.more)) {
    patchedImageUrls.more = [];
    for (const entry of originalImageUrls.more) {
      patchedImageUrls.more.push({
        sm: resolvePath(entry.sm),
        lg: resolvePath(entry.lg),
      });
    }
  }

  if (Object.keys(patchedImageUrls).length) {
    product.image_urls = patchedImageUrls;
  }

  product.image_url =
    resolvePath(product.image_url) ??
    patchedImageUrls["1920"] ??
    patchedImageUrls["1024"] ??
    patchedImageUrls["512"] ??
    patchedImageUrls["256"] ??
    product.image_url ??
    null;
}

async function runUploadsInBatches({
  jobs,
  batchSize,
  supabase,
  supabaseUrl,
  htmlRoot,
  registry,
}) {
  const stats = emptyRunTotals();

  for (let index = 0; index < jobs.length; index += batchSize) {
    const batch = jobs.slice(index, index + batchSize);
    const results = await Promise.allSettled(
      batch.map((job) =>
        uploadLocalFile({
          supabase,
          supabaseUrl,
          categoryFolder: job.categoryFolder,
          htmlRoot,
          localRelativePath: job.localRelativePath,
          objectPath: job.objectPath,
        }),
      ),
    );

    for (const [resultIndex, result] of results.entries()) {
      const job = batch[resultIndex];
      if (result.status === "fulfilled") {
        registry.remember(job.objectPath, result.value);
        stats.uploads_uploaded += 1;
      } else {
        stats.uploads_failed += 1;
        console.warn(
          `  ${job.slug}: upload failed (${job.localRelativePath}): ${String(result.reason?.message || result.reason)}`,
        );
      }
    }
  }

  return stats;
}

async function uploadLocalFile({
  supabase,
  supabaseUrl,
  categoryFolder,
  htmlRoot,
  localRelativePath,
  objectPath,
}) {
  const absolutePath = resolveLocalAbsolutePath(
    localRelativePath,
    categoryFolder,
    htmlRoot,
  );
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
  if (!supabase) return false;

  const folder = path.posix.dirname(objectPath);
  const fileName = path.posix.basename(objectPath);
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    search: fileName,
    limit: 1,
  });

  if (error) return false;
  return (data ?? []).some((item) => item.name === fileName);
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
