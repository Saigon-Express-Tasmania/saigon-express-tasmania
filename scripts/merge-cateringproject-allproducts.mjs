#!/usr/bin/env node
/**
 * Merge category allproducts.json files into a deduplicated totalproducts.json.
 *
 * Reads:
 *   refs/cateringproject/htmls/<category-slug>/allproducts.json
 *
 * Writes:
 *   refs/cateringproject/htmls/totalproducts.json
 *
 * Duplicate products (same inferred slug) are merged into one row:
 *   - category becomes a string array of unique listing categories
 *   - one image set is kept (prefers Supabase URLs, then richest gallery)
 *   - local image paths are prefixed with the source category folder
 *     e.g. morning-tea-sweet/images/protein-ball-platter/...
 *
 * Image files are not moved.
 *
 * Usage:
 *   node scripts/merge-cateringproject-allproducts.mjs
 *   node scripts/merge-cateringproject-allproducts.mjs --html-root refs/cateringproject/htmls
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  inferProductSlug,
  prefixProductImagePaths,
  scoreProductImages,
} from "./lib/cateringproject-product-slug.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_HTML_ROOT = path.join(root, "refs/cateringproject/htmls");

const options = parseArgs(process.argv.slice(2));
const htmlRoot = path.resolve(root, options.htmlRoot);

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
}

function main() {
  const categorySlugs = listCategoryFolders(htmlRoot);
  const bySlug = new Map();
  let sourceEntries = 0;
  let missingSlug = 0;

  for (const categorySlug of categorySlugs) {
    const allProductsPath = path.join(htmlRoot, categorySlug, "allproducts.json");
    const products = readJson(allProductsPath);

    for (const product of products) {
      sourceEntries += 1;
      const productSlug = inferProductSlug(product);
      if (!productSlug) {
        missingSlug += 1;
        continue;
      }

      if (!bySlug.has(productSlug)) bySlug.set(productSlug, []);
      bySlug.get(productSlug).push({ categorySlug, product });
    }
  }

  const mergedProducts = [...bySlug.entries()]
    .map(([productSlug, entries]) => mergeProductEntries(productSlug, entries))
    .sort((a, b) => a.name.localeCompare(b.name));

  const outputPath = path.join(htmlRoot, "totalproducts.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(mergedProducts, null, 2)}\n`, "utf8");

  const summary = {
    generated_at: new Date().toISOString(),
    html_root: htmlRoot,
    output: outputPath,
    categories_scanned: categorySlugs.length,
    source_entries: sourceEntries,
    merged_products: mergedProducts.length,
    duplicates_merged: sourceEntries - mergedProducts.length - missingSlug,
    entries_missing_slug: missingSlug,
    multi_category_products: mergedProducts.filter(
      (product) => (product._source?.category_slugs?.length ?? 0) > 1,
    ).length,
  };

  fs.writeFileSync(
    path.join(htmlRoot, "_merge-allproducts-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Merged ${sourceEntries} entries from ${categorySlugs.length} categories into ${mergedProducts.length} products`,
  );
  console.log(
    `Duplicates merged: ${summary.duplicates_merged}, multi-category products: ${summary.multi_category_products}`,
  );
  console.log(`Wrote ${relativize(outputPath)}`);
}

function mergeProductEntries(productSlug, entries) {
  const ranked = entries
    .map((entry) => ({
      ...entry,
      score:
        scoreProductImages(entry.product) +
        Math.min(String(entry.product.description ?? "").length, 100),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.categorySlug.localeCompare(b.categorySlug) ||
        a.product.name.localeCompare(b.product.name),
    );

  const best = ranked[0];
  const merged = prefixProductImagePaths(structuredClone(best.product), best.categorySlug);

  const categories = [
    ...new Set(
      entries
        .map((entry) => String(entry.product.category ?? "").trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const categorySlugs = [...new Set(entries.map((entry) => entry.categorySlug))].sort(
    (a, b) => a.localeCompare(b),
  );

  merged.category = categories.length ? categories : [];
  merged.id = null;
  merged.slug = "";
  merged.product_slug = productSlug;

  const longestDescription = entries
    .map((entry) => String(entry.product.description ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];
  if (longestDescription) merged.description = longestDescription;

  const longestNote = entries
    .map((entry) => String(entry.product.note ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];
  merged.note = longestNote || null;

  const includes = [];
  const seenIncludes = new Set();
  for (const entry of entries) {
    for (const item of entry.product.includes ?? []) {
      const key = String(item);
      if (seenIncludes.has(key)) continue;
      seenIncludes.add(key);
      includes.push(item);
    }
  }
  merged.includes = includes;

  merged.image_url =
    merged.image_urls?.["1920"] ??
    merged.image_urls?.["1024"] ??
    merged.image_urls?.["512"] ??
    merged.image_urls?.["256"] ??
    merged.image_url ??
    null;

  merged._source = {
    category_slugs: categorySlugs,
    merged_from: entries.length,
    image_category_slug: best.categorySlug,
  };

  return merged;
}

function parseArgs(inputArgs) {
  const result = {
    htmlRoot: relativize(DEFAULT_HTML_ROOT),
  };

  for (const arg of inputArgs) {
    if (arg.startsWith("--html-root=")) {
      result.htmlRoot = arg.slice("--html-root=".length);
    }
  }

  return result;
}

function listCategoryFolders(baseDir) {
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(baseDir, name, "allproducts.json")))
    .sort((a, b) => a.localeCompare(b));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function relativize(absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/");
}
