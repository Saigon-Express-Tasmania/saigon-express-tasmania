#!/usr/bin/env node
/**
 * Reverse upload-cateringproject-allproducts-images.mjs:
 * delete Supabase Storage objects referenced by product image URLs and,
 * when local files still exist, patch JSON back to local paths.
 *
 * Reads per category (default):
 *   refs/cateringproject/htmls/<category-slug>/allproducts.json
 *
 * Optional merged catalog:
 *   refs/cateringproject/htmls/totalproducts.json
 *
 * Deletes objects at:
 *   catering-packs/<product-slug>/<filename>
 *
 * Reverts to local paths when files exist:
 *   per-category JSON: images/<product-slug>/<filename>
 *   totalproducts.json: <image-category-slug>/images/<product-slug>/<filename>
 *
 * Usage:
 *   node scripts/revert-cateringproject-allproducts-images.mjs
 *   node scripts/revert-cateringproject-allproducts-images.mjs --dry-run
 *   node scripts/revert-cateringproject-allproducts-images.mjs --category-slugs=afternoon-tea-disposables
 *   node scripts/revert-cateringproject-allproducts-images.mjs --totalproducts
 *   node scripts/revert-cateringproject-allproducts-images.mjs --totalproducts-only
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
  BUCKET,
  categoryLocalImagePath,
  isSupabasePublicUrl,
  parseSupabaseObjectPath,
  prefixedLocalImagePath,
} from "./lib/cateringproject-supabase-images.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_HTML_ROOT = path.join(root, "refs/cateringproject/htmls");

const options = parseArgs(process.argv.slice(2));
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

  const deletedObjects = new Set();
  const batchSummary = {
    generated_at: new Date().toISOString(),
    html_root: htmlRoot,
    bucket: BUCKET,
    dry_run: dryRun,
    targets: [],
  };

  const jobs = [];
  if (!options.totalProductsOnly) {
    for (const categoryFolder of resolveCategoryFolders()) {
      jobs.push({
        kind: "category",
        label: path.basename(categoryFolder),
        jsonPath: path.join(categoryFolder, "allproducts.json"),
        categoryFolder,
        categorySlug: path.basename(categoryFolder),
      });
    }
  }

  if (options.totalProducts || options.totalProductsOnly) {
    jobs.push({
      kind: "totalproducts",
      label: "totalproducts.json",
      jsonPath: path.join(htmlRoot, "totalproducts.json"),
      categoryFolder: htmlRoot,
      categorySlug: null,
    });
  }

  console.log(
    `${dryRun ? "Dry run" : "Reverting"} Supabase images for ${jobs.length} target(s)...`,
  );

  for (const [index, job] of jobs.entries()) {
    if (!fs.existsSync(job.jsonPath)) {
      console.warn(
        `[${index + 1}/${jobs.length}] ${job.label} skipped (missing ${relativize(job.jsonPath)})`,
      );
      continue;
    }

    const products = readJson(job.jsonPath);
    if (!Array.isArray(products)) {
      throw new Error(`${job.jsonPath} must be a JSON array`);
    }

    const stats = {
      products: products.length,
      products_with_remote_images: 0,
      urls_scanned: 0,
      deleted: 0,
      delete_skipped: 0,
      delete_failed: 0,
      reverted: 0,
      revert_unavailable: 0,
    };

    for (const product of products) {
      const productStats = await revertProductImages({
        product,
        job,
        supabase,
        deletedObjects,
      });

      if (productStats.had_remote) stats.products_with_remote_images += 1;
      stats.urls_scanned += productStats.urls_scanned;
      stats.deleted += productStats.deleted;
      stats.delete_skipped += productStats.delete_skipped;
      stats.delete_failed += productStats.delete_failed;
      stats.reverted += productStats.reverted;
      stats.revert_unavailable += productStats.revert_unavailable;
    }

    if (!dryRun) {
      fs.writeFileSync(job.jsonPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
    }

    batchSummary.targets.push({
      target: job.label,
      json_path: job.jsonPath,
      kind: job.kind,
      stats,
    });

    console.log(
      `[${index + 1}/${jobs.length}] ${job.label} remote products ${stats.products_with_remote_images}/${stats.products} (${stats.deleted} deleted, ${stats.delete_skipped} already removed, ${stats.delete_failed} failed, ${stats.reverted} reverted, ${stats.revert_unavailable} left remote)`,
    );
  }

  fs.writeFileSync(
    path.join(htmlRoot, "_allproducts-revert-summary.json"),
    `${JSON.stringify(batchSummary, null, 2)}\n`,
    "utf8",
  );
}

async function revertProductImages({ product, job, supabase, deletedObjects }) {
  const stats = {
    had_remote: false,
    urls_scanned: 0,
    deleted: 0,
    delete_skipped: 0,
    delete_failed: 0,
    reverted: 0,
    revert_unavailable: 0,
  };

  const imageUrls = product.image_urls ?? {};
  const nextImageUrls = { ...imageUrls };

  for (const key of ["256", "512", "1024", "1920"]) {
    if (typeof imageUrls[key] !== "string") continue;
    stats.urls_scanned += 1;
    const result = await revertImageUrl({
      value: imageUrls[key],
      job,
      product,
      supabase,
      deletedObjects,
    });
    applyRevertResult(stats, result);
    nextImageUrls[key] = result.nextValue;
    if (result.wasRemote) stats.had_remote = true;
  }

  if (Array.isArray(imageUrls.more)) {
    nextImageUrls.more = [];
    for (const entry of imageUrls.more) {
      const nextEntry = { ...entry };
      for (const field of ["sm", "lg"]) {
        if (typeof entry[field] !== "string") continue;
        stats.urls_scanned += 1;
        const result = await revertImageUrl({
          value: entry[field],
          job,
          product,
          supabase,
          deletedObjects,
        });
        applyRevertResult(stats, result);
        nextEntry[field] = result.nextValue;
        if (result.wasRemote) stats.had_remote = true;
      }
      nextImageUrls.more.push(nextEntry);
    }
  }

  if (stats.had_remote) {
    product.image_urls = nextImageUrls;
    product.image_url =
      nextImageUrls["1920"] ??
      nextImageUrls["1024"] ??
      nextImageUrls["512"] ??
      nextImageUrls["256"] ??
      product.image_url ??
      null;
  }

  return stats;
}

function applyRevertResult(stats, result) {
  if (result.deleteStatus === "deleted") stats.deleted += 1;
  if (result.deleteStatus === "skipped") stats.delete_skipped += 1;
  if (result.deleteStatus === "failed") stats.delete_failed += 1;
  if (result.reverted) stats.reverted += 1;
  if (result.revertUnavailable) stats.revert_unavailable += 1;
}

async function revertImageUrl({ value, job, product, supabase, deletedObjects }) {
  if (!isSupabasePublicUrl(value)) {
    return { nextValue: value, wasRemote: false, deleteStatus: null, reverted: false, revertUnavailable: false };
  }

  const parsed = parseSupabaseObjectPath(value);
  if (!parsed) {
    return {
      nextValue: value,
      wasRemote: true,
      deleteStatus: "failed",
      reverted: false,
      revertUnavailable: true,
    };
  }

  const deleteStatus = await deleteStorageObject({
    supabase,
    objectPath: parsed.objectPath,
    deletedObjects,
  });

  const localPath = resolveLocalPath({
    parsed,
    job,
    product,
  });

  if (localPath) {
    return {
      nextValue: localPath,
      wasRemote: true,
      deleteStatus,
      reverted: true,
      revertUnavailable: false,
    };
  }

  return {
    nextValue: value,
    wasRemote: true,
    deleteStatus,
    reverted: false,
    revertUnavailable: true,
  };
}

function resolveLocalPath({ parsed, job, product }) {
  const { productSlug, fileName } = parsed;
  const relativePath = categoryLocalImagePath(productSlug, fileName);

  if (job.kind === "category") {
    return fs.existsSync(path.join(job.categoryFolder, relativePath))
      ? relativePath
      : null;
  }

  const preferredCategorySlug = product._source?.image_category_slug;
  const categorySlugs = listCategoryFolders(htmlRoot);
  const searchSlugs = preferredCategorySlug
    ? [preferredCategorySlug, ...categorySlugs.filter((slug) => slug !== preferredCategorySlug)]
    : categorySlugs;

  for (const categorySlug of searchSlugs) {
    const absolutePath = path.join(htmlRoot, categorySlug, relativePath);
    if (fs.existsSync(absolutePath)) {
      return prefixedLocalImagePath(categorySlug, productSlug, fileName);
    }
  }

  return null;
}

async function deleteStorageObject({ supabase, objectPath, deletedObjects }) {
  if (deletedObjects.has(objectPath)) {
    return "skipped";
  }

  if (dryRun) {
    deletedObjects.add(objectPath);
    return "deleted";
  }

  const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
  if (error) {
    console.warn(`  delete failed (${objectPath}): ${error.message}`);
    return "failed";
  }

  deletedObjects.add(objectPath);
  return "deleted";
}

function parseArgs(inputArgs) {
  const result = {
    htmlRoot: relativize(DEFAULT_HTML_ROOT),
    categoryPath: null,
    categorySlugs: null,
    dryRun: false,
    totalProducts: false,
    totalProductsOnly: false,
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
    } else if (arg === "--totalproducts") {
      result.totalProducts = true;
    } else if (arg === "--totalproducts-only") {
      result.totalProductsOnly = true;
    }
  }

  return result;
}

function resolveCategoryFolders() {
  if (options.categoryPath) {
    return [path.resolve(root, options.categoryPath)];
  }

  return listCategoryFolders(htmlRoot).filter(
    (name) => !options.categorySlugs || options.categorySlugs.has(name),
  ).map((name) => path.join(htmlRoot, name));
}

function listCategoryFolders(baseDir) {
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("."))
    .filter((name) => fs.existsSync(path.join(baseDir, name, "allproducts.json")))
    .sort((a, b) => a.localeCompare(b));
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
