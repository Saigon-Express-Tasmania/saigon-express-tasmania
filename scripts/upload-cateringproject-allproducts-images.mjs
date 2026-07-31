#!/usr/bin/env node
/**
 * Upload Catering Project local images to Cloudflare R2.
 *
 * Reads the deduplicated catalog:
 *   refs/cateringproject/htmls/totalproducts.json
 *
 * Local image files are resolved from:
 *   - Prefixed local paths in totalproducts.json, e.g.
 *       refs/cateringproject/htmls/<category-slug>/images/<product-slug>/*
 *   - Legacy Supabase catering-packs public URLs (re-upload from local files)
 *
 * Uploads each local image once per product slug, then patches image_urls /
 * image_url in totalproducts.json only (category allproducts.json is not modified).
 *
 * Uploads run concurrently in batches of 10.
 *   products/catering-packs/<product-slug>/<filename>
 *
 * Patches totalproducts.json image_urls / image_url with R2 public URLs.
 * Products with no remaining local/migratable image refs are skipped.
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
 *   - Does not upload to R2 or write totalproducts.json
 *   - Scans local images, counts sizes/bytes, and reports planned uploads + JSON patches
 *
 * Env (from .env / .env.local, and admin/.env / admin/.env.local):
 *   R2_ACCOUNT_ID or VITE_R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID or VITE_R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY or VITE_R2_SECRET_ACCESS_KEY
 *   R2_BUCKET or VITE_R2_BUCKET
 *   R2_PUBLIC_URL or VITE_R2_PUBLIC_URL
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FOLDER,
  buildPublicUrl,
  isLegacySupabaseCateringUrl,
  isR2PublicUrl,
  parseCateringPackObjectPath,
  parseR2ObjectPath,
  prefixedLocalImagePath,
} from "./lib/cateringproject-r2-images.mjs";
import {
  inferProductSlug,
  isPrefixedLocalImagePath,
} from "./lib/cateringproject-product-slug.mjs";
import {
  getR2Env,
  requireR2Config,
  r2ObjectExists,
  uploadR2Object,
} from "./lib/r2-client.mjs";

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
  loadEnvFile(path.join(root, "admin/.env"));
  loadEnvFile(path.join(root, "admin/.env.local"));

  const r2Env = getR2Env();
  const reportPublicUrl = r2Env.publicUrl || "https://<R2_PUBLIC_URL>";

  if (!dryRun) {
    requireR2Config({ requirePublicUrl: true });
  } else if (!r2Env.publicUrl) {
    console.warn(
      "Warning: R2_PUBLIC_URL / VITE_R2_PUBLIC_URL not set; dry-run URLs will use a placeholder.",
    );
  }

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
  const registry = createUploadRegistry(totalProducts, reportPublicUrl);

  const batchSummary = {
    generated_at: new Date().toISOString(),
    html_root: htmlRoot,
    totalproducts_path: totalProductsPath,
    products_in_file: allTotalProducts.length,
    products_selected: totalProducts.length,
    registry_seeded_urls: registry.size(),
    upload_batch_size: UPLOAD_BATCH_SIZE,
    bucket: r2Env.bucket,
    folder: FOLDER,
    public_url: reportPublicUrl,
    dry_run: dryRun,
    skip_uploaded: options.skipUploaded,
    totals: emptyRunTotals(),
    totalproducts: null,
  };

  console.log(
    `${dryRun ? "Dry run" : "Uploading"} images for ${totalProducts.length} products (${registry.size()} R2 URLs in registry)...`,
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
    r2PublicUrl: reportPublicUrl,
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
  r2PublicUrl,
  registry,
  dryRun,
  stats,
  productDetails,
}) {
  stats.products_total = products.length;

  if (dryRun) {
    for (const product of products) {
      if (!hasUploadableImageRefs(product, r2PublicUrl)) {
        stats.products_skipped_remote += 1;
        if (productDetails) {
          productDetails.push({
            product_slug: getProductSlug(product),
            product_name: product.name ?? null,
            status: "skipped_already_on_r2_or_no_source",
            image_url: product.image_url ?? null,
          });
        }
        continue;
      }

      const plan = planProductImages({
        product,
        categoryFolder,
        htmlRoot,
        r2PublicUrl,
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
    if (!hasUploadableImageRefs(product, r2PublicUrl)) {
      stats.products_skipped_remote += 1;
      continue;
    }

    const prepared = prepareProductImagePatches({
      product,
      categoryFolder,
      htmlRoot,
      r2PublicUrl,
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
      const exists = await r2ObjectExists(job.objectPath);
      if (exists) {
        registry.remember(job.objectPath, buildPublicUrl(r2PublicUrl, job.objectPath));
        uploadJobsByObjectPath.delete(job.objectPath);
        stats.uploads_skipped_existing += 1;
      }
    }
  }

  const pendingUploads = [...uploadJobsByObjectPath.values()];
  const uploadStats = await runUploadsInBatches({
    jobs: pendingUploads,
    batchSize: UPLOAD_BATCH_SIZE,
    htmlRoot,
    r2PublicUrl,
    registry,
  });
  mergeRunTotals(stats, uploadStats);

  for (const prepared of productsToPatch) {
    applyProductImagePatches({
      product: prepared.product,
      slug: prepared.slug,
      categoryFolder: prepared.categoryFolder,
      htmlRoot: prepared.htmlRoot,
      r2PublicUrl: prepared.r2PublicUrl,
      registry: prepared.registry,
    });
  }
}

function createUploadRegistry(totalProducts, r2PublicUrl) {
  const objectPathToUrl = new Map();

  function store(objectPath, url) {
    if (objectPath && url) objectPathToUrl.set(objectPath, url);
  }

  function seedFromValue(value) {
    const parsed = parseR2ObjectPath(value, r2PublicUrl);
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

function hasUploadableImageRefs(product, r2PublicUrl) {
  const urls = product.image_urls ?? {};

  for (const key of ["256", "512", "1024", "1920"]) {
    if (isUploadableImageRef(urls[key], r2PublicUrl)) return true;
  }

  if (isUploadableImageRef(product.image_url, r2PublicUrl)) return true;

  if (Array.isArray(urls.more)) {
    for (const entry of urls.more) {
      if (
        isUploadableImageRef(entry.sm, r2PublicUrl) ||
        isUploadableImageRef(entry.lg, r2PublicUrl)
      ) {
        return true;
      }
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

/** Local path or legacy Supabase catering-packs URL that can be re-uploaded to R2. */
function isUploadableImageRef(value, r2PublicUrl) {
  if (isLocalImagePath(value)) return true;
  if (isLegacySupabaseCateringUrl(value)) return true;
  if (isR2PublicUrl(value, r2PublicUrl)) return false;
  return false;
}

function resolveLocalAbsolutePath(localRelativePath, categoryFolder, htmlRoot) {
  if (isPrefixedLocalImagePath(localRelativePath)) {
    return path.join(htmlRoot, localRelativePath);
  }

  return path.join(categoryFolder, localRelativePath);
}

function findLocalAbsolutePathForSlugFile({
  product,
  productSlug,
  fileName,
  htmlRoot,
}) {
  const candidates = [];
  const imageCategory = product._source?.image_category_slug;
  const categorySlugs = product._source?.category_slugs ?? [];

  if (imageCategory) {
    candidates.push(path.join(htmlRoot, imageCategory, "images", productSlug, fileName));
  }
  for (const slug of categorySlugs) {
    candidates.push(path.join(htmlRoot, slug, "images", productSlug, fileName));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Fallback: scan category folders under html root.
  if (!fs.existsSync(htmlRoot)) return null;
  for (const entry of fs.readdirSync(htmlRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(
      htmlRoot,
      entry.name,
      "images",
      productSlug,
      fileName,
    );
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function resolveUploadSource({
  value,
  product,
  slug,
  categoryFolder,
  htmlRoot,
  r2PublicUrl,
}) {
  if (!value || typeof value !== "string") return null;

  if (isR2PublicUrl(value, r2PublicUrl)) {
    const parsed = parseR2ObjectPath(value, r2PublicUrl);
    return parsed
      ? { kind: "already_remote", objectPath: parsed.objectPath, publicUrl: value }
      : { kind: "unchanged", value };
  }

  if (isLocalImagePath(value)) {
    const fileName = path.basename(value);
    const objectPath = `${FOLDER}/${slug}/${fileName}`;
    const absolutePath = resolveLocalAbsolutePath(value, categoryFolder, htmlRoot);
    return {
      kind: "upload",
      objectPath,
      absolutePath,
      localRelativePath: value,
      fileName,
    };
  }

  if (isLegacySupabaseCateringUrl(value)) {
    const parsed = parseCateringPackObjectPath(value, r2PublicUrl);
    if (!parsed) return { kind: "unchanged", value };

    const absolutePath = findLocalAbsolutePathForSlugFile({
      product,
      productSlug: parsed.productSlug,
      fileName: parsed.fileName,
      htmlRoot,
    });

    return {
      kind: "upload",
      objectPath: parsed.objectPath,
      absolutePath,
      localRelativePath:
        absolutePath != null
          ? relativize(absolutePath).replace(/^refs\/cateringproject\/htmls\//, "")
          : prefixedLocalImagePath(
              product._source?.image_category_slug ??
                product._source?.category_slugs?.[0] ??
                "unknown",
              parsed.productSlug,
              parsed.fileName,
            ),
      fileName: parsed.fileName,
      legacyUrl: value,
    };
  }

  return { kind: "unchanged", value };
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

function planProductImages({ product, categoryFolder, htmlRoot, r2PublicUrl, registry }) {
  const slug = getProductSlug(product);
  const stats = emptyRunTotals();
  const uploads = [];
  const jsonPatches = [];
  const seenObjectPaths = new Set();

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

  function planPath(field, value) {
    if (!value) return value;

    const source = resolveUploadSource({
      value,
      product,
      slug,
      categoryFolder,
      htmlRoot,
      r2PublicUrl,
    });

    if (!source || source.kind === "unchanged") {
      stats.refs_unchanged += 1;
      return value;
    }

    if (source.kind === "already_remote") {
      stats.refs_already_remote += 1;
      registry.remember(source.objectPath, source.publicUrl);
      return source.publicUrl;
    }

    const publicUrl = planLocalUpload({
      source,
      stats,
      uploads,
      seenObjectPaths,
      registry,
      r2PublicUrl,
    });

    if (publicUrl !== value) {
      jsonPatches.push({
        field,
        from: value,
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
  source,
  stats,
  uploads,
  seenObjectPaths,
  registry,
  r2PublicUrl,
}) {
  const { objectPath, absolutePath, localRelativePath, fileName } = source;

  if (seenObjectPaths.has(objectPath)) {
    const existing = uploads.find((item) => item.object_path === objectPath);
    return (
      existing?.public_url ??
      registry.getUrl(objectPath) ??
      buildPublicUrl(r2PublicUrl, objectPath)
    );
  }
  seenObjectPaths.add(objectPath);

  const cachedUrl = registry.getUrl(objectPath);
  if (cachedUrl) {
    stats.uploads_deduplicated += 1;
    return cachedUrl;
  }

  const exists = Boolean(absolutePath && fs.existsSync(absolutePath));
  const sizeBytes = exists ? fs.statSync(absolutePath).size : 0;
  const contentType = mimeTypeForPath(absolutePath || fileName);
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

  const publicUrl = buildPublicUrl(r2PublicUrl, objectPath);
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
    legacy_url: source.legacyUrl ?? null,
  });

  return publicUrl;
}

function inferSizeVariant(fileName, localRelativePath) {
  const fromName = fileName.match(/_(\d+)\.[^.]+$/);
  if (fromName) return fromName[1];

  const parts = String(localRelativePath ?? "")
    .split("/")
    .filter(Boolean);
  if (parts.length >= 3) {
    const variantDir = parts[2];
    if (/^\d+$/.test(variantDir)) return variantDir;
  }

  return "unknown";
}

function logProgress({ label, stats, dryRun }) {
  if (dryRun) {
    console.log(
      `${label} plan: ${stats.products_to_patch} products to patch, ${stats.products_skipped_remote} already on R2 / no source, ${stats.uploads_planned} uploads (${formatBytes(stats.bytes_to_upload)}), ${stats.uploads_deduplicated} deduplicated, ${stats.missing_local_files} missing files`,
    );
    return;
  }

  console.log(
    `${label} patched ${stats.products_to_patch} products (${stats.products_skipped_remote} already on R2 / no source, ${stats.uploads_uploaded} uploaded, ${stats.uploads_deduplicated} deduplicated, ${stats.uploads_skipped_existing} skipped, ${stats.uploads_failed} failed)`,
  );
}

function printBatchSummary(batchSummary, summaryPath) {
  const { totals, dry_run: isDryRun } = batchSummary;

  console.log("");
  console.log(isDryRun ? "=== Dry run summary ===" : "=== Upload summary ===");
  console.log(`Products in totalproducts.json: ${batchSummary.products_in_file}`);
  if (batchSummary.products_selected !== batchSummary.products_in_file) {
    console.log(`Products selected: ${batchSummary.products_selected}`);
  }
  console.log(`R2 folder: ${batchSummary.folder}`);
  console.log(`Products to patch: ${totals.products_to_patch}`);
  console.log(`Products already on R2 / no source: ${totals.products_skipped_remote}`);

  if (isDryRun) {
    console.log(`Uploads planned: ${totals.uploads_planned}`);
    console.log(`Uploads deduplicated (registry): ${totals.uploads_deduplicated}`);
    console.log(`Total upload size: ${formatBytes(totals.bytes_to_upload)}`);
    console.log(`Missing local files: ${totals.missing_local_files}`);
    console.log(`Image refs already on R2: ${totals.refs_already_remote}`);
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
    console.log(`Image refs already on R2: ${totals.refs_already_remote}`);
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
  product,
  slug,
  categoryFolder,
  htmlRoot,
  r2PublicUrl,
  registry,
  stats,
  uploadJobs,
  collectUploads,
}) {
  const localToPublic = new Map();

  function resolvePath(value) {
    if (!value) return value;

    const source = resolveUploadSource({
      value,
      product,
      slug,
      categoryFolder,
      htmlRoot,
      r2PublicUrl,
    });

    if (!source || source.kind === "unchanged") {
      stats.refs_unchanged += 1;
      return value;
    }

    if (source.kind === "already_remote") {
      stats.refs_already_remote += 1;
      registry.remember(source.objectPath, source.publicUrl);
      return source.publicUrl;
    }

    if (localToPublic.has(source.objectPath)) {
      return localToPublic.get(source.objectPath);
    }

    const cachedUrl = registry.getUrl(source.objectPath);
    if (cachedUrl) {
      localToPublic.set(source.objectPath, cachedUrl);
      stats.uploads_deduplicated += 1;
      return cachedUrl;
    }

    if (collectUploads) {
      uploadJobs.push({
        localRelativePath: source.localRelativePath,
        absolutePath: source.absolutePath,
        objectPath: source.objectPath,
        categoryFolder,
        slug,
      });
      localToPublic.set(source.objectPath, value);
      return value;
    }

    return value;
  }

  return resolvePath;
}

function prepareProductImagePatches({
  product,
  categoryFolder,
  htmlRoot,
  r2PublicUrl,
  registry,
}) {
  const stats = emptyRunTotals();
  const slug = getProductSlug(product);
  if (!slug) return null;

  stats.products_to_patch = 1;
  const uploadJobs = [];
  const resolvePath = createImagePathResolver({
    product,
    slug,
    categoryFolder,
    htmlRoot,
    r2PublicUrl,
    registry,
    stats,
    uploadJobs,
    collectUploads: true,
  });

  for (const imageRef of collectProductImagePaths(product)) {
    resolvePath(imageRef);
  }

  return {
    product,
    slug,
    categoryFolder,
    htmlRoot,
    r2PublicUrl,
    registry,
    stats,
    uploadJobs,
  };
}

function applyProductImagePatches({
  product,
  slug,
  categoryFolder,
  htmlRoot,
  r2PublicUrl,
  registry,
}) {
  const stats = emptyRunTotals();
  const resolvePath = createImagePathResolver({
    product,
    slug,
    categoryFolder,
    htmlRoot,
    r2PublicUrl,
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
  htmlRoot,
  r2PublicUrl,
  registry,
}) {
  const stats = emptyRunTotals();

  for (let index = 0; index < jobs.length; index += batchSize) {
    const batch = jobs.slice(index, index + batchSize);
    const results = await Promise.allSettled(
      batch.map((job) =>
        uploadLocalFile({
          r2PublicUrl,
          absolutePath: job.absolutePath,
          localRelativePath: job.localRelativePath,
          objectPath: job.objectPath,
          categoryFolder: job.categoryFolder,
          htmlRoot,
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

    process.stdout.write(
      `uploaded ${Math.min(index + batchSize, jobs.length)}/${jobs.length}\n`,
    );
  }

  return stats;
}

async function uploadLocalFile({
  r2PublicUrl,
  absolutePath,
  localRelativePath,
  objectPath,
  categoryFolder,
  htmlRoot: uploadHtmlRoot,
}) {
  const resolvedAbsolutePath =
    absolutePath ||
    resolveLocalAbsolutePath(localRelativePath, categoryFolder, uploadHtmlRoot);

  if (!resolvedAbsolutePath || !fs.existsSync(resolvedAbsolutePath)) {
    throw new Error(`missing local file: ${localRelativePath}`);
  }

  const buffer = fs.readFileSync(resolvedAbsolutePath);
  const contentType = mimeTypeForPath(resolvedAbsolutePath);

  await uploadR2Object(objectPath, buffer, contentType);
  return buildPublicUrl(r2PublicUrl, objectPath);
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
