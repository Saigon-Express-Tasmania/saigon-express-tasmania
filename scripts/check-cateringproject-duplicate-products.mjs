#!/usr/bin/env node
/**
 * Find duplicate catering products by slug across category allproducts.json files.
 *
 * Reads:
 *   refs/cateringproject/htmls/<category-slug>/allproducts.json
 *
 * Writes:
 *   refs/cateringproject/htmls/_duplicate-products-report.json
 *
 * Slug is inferred from image paths (images/<slug>/ or catering-packs/<slug>/),
 * then SKU (CP-...), matching the upload/generate scripts.
 *
 * Usage:
 *   node scripts/check-cateringproject-duplicate-products.mjs
 *   node scripts/check-cateringproject-duplicate-products.mjs --min-categories=2
 *   node scripts/check-cateringproject-duplicate-products.mjs --html-root refs/cateringproject/htmls
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  const categories = listCategoryFolders(htmlRoot);
  const bySlug = new Map();
  const withinCategoryDuplicates = [];
  let totalEntries = 0;
  let missingSlug = 0;

  for (const categorySlug of categories) {
    const allProductsPath = path.join(htmlRoot, categorySlug, "allproducts.json");
    const products = readJson(allProductsPath);
    const seenInCategory = new Map();

    for (const [index, product] of products.entries()) {
      totalEntries += 1;
      const slug = inferProductSlug(product);
      if (!slug) {
        missingSlug += 1;
        continue;
      }

      const entry = {
        category_slug: categorySlug,
        index,
        name: product.name,
        sku: product.sku ?? null,
        id: product.id ?? null,
      };

      if (!bySlug.has(slug)) bySlug.set(slug, []);
      bySlug.get(slug).push(entry);

      if (seenInCategory.has(slug)) {
        withinCategoryDuplicates.push({
          category_slug: categorySlug,
          slug,
          first: seenInCategory.get(slug),
          duplicate: entry,
        });
      } else {
        seenInCategory.set(slug, entry);
      }
    }
  }

  const duplicatedSlugs = [...bySlug.entries()]
    .map(([slug, entries]) => {
      const categorySlugs = [...new Set(entries.map((entry) => entry.category_slug))];
      return {
        slug,
        entry_count: entries.length,
        category_count: categorySlugs.length,
        category_slugs: categorySlugs.sort(),
        entries,
      };
    })
    .filter(
      (row) =>
        row.entry_count > 1 &&
        row.category_count >= options.minCategories,
    )
    .sort(
      (a, b) =>
        b.entry_count - a.entry_count ||
        b.category_count - a.category_count ||
        a.slug.localeCompare(b.slug),
    );

  const uniqueSlugs = [...bySlug.keys()].filter(
    (slug) => bySlug.get(slug).length === 1,
  ).length;

  const report = {
    generated_at: new Date().toISOString(),
    html_root: htmlRoot,
    min_categories: options.minCategories,
    stats: {
      categories_scanned: categories.length,
      total_entries: totalEntries,
      unique_slugs: bySlug.size,
      slugs_with_single_entry: uniqueSlugs,
      slugs_duplicated: duplicatedSlugs.length,
      within_category_duplicates: withinCategoryDuplicates.length,
      entries_missing_slug: missingSlug,
      max_entries_for_one_slug: duplicatedSlugs[0]?.entry_count ?? 0,
    },
    within_category_duplicates: withinCategoryDuplicates,
    duplicated_slugs: duplicatedSlugs,
  };

  const reportPath = path.join(htmlRoot, "_duplicate-products-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Scanned ${categories.length} categories, ${totalEntries} product entries`);
  console.log(`Unique slugs: ${bySlug.size}`);
  console.log(`Within-category duplicates: ${withinCategoryDuplicates.length}`);
  console.log(
    `Cross-category duplicated slugs (>= ${options.minCategories} categories): ${duplicatedSlugs.length}`,
  );
  console.log(`Report: ${relativize(reportPath)}\n`);

  if (duplicatedSlugs.length) {
    console.log("Top duplicated slugs:");
    for (const row of duplicatedSlugs.slice(0, 20)) {
      console.log(
        `  ${row.slug} — ${row.entry_count} entries across ${row.category_count} categories`,
      );
      for (const entry of row.entries.slice(0, 3)) {
        console.log(`    ${entry.category_slug} | ${entry.name}`);
      }
      if (row.entries.length > 3) {
        console.log(`    ... +${row.entries.length - 3} more`);
      }
    }
  }
}

function parseArgs(inputArgs) {
  const result = {
    htmlRoot: relativize(DEFAULT_HTML_ROOT),
    minCategories: 2,
  };

  for (const arg of inputArgs) {
    if (arg.startsWith("--html-root=")) {
      result.htmlRoot = arg.slice("--html-root=".length);
    } else if (arg.startsWith("--min-categories=")) {
      const value = Number(arg.slice("--min-categories=".length));
      result.minCategories =
        Number.isFinite(value) && value > 0 ? Math.floor(value) : 2;
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

function inferProductSlug(product) {
  const urls = product.image_urls ?? {};

  for (const key of ["256", "512", "1024", "1920"]) {
    const slug = slugFromImagePath(urls[key]);
    if (slug) return slug;
  }

  const fromImageUrl = slugFromImagePath(product.image_url);
  if (fromImageUrl) return fromImageUrl;

  if (Array.isArray(urls.more)) {
    for (const entry of urls.more) {
      const slug = slugFromImagePath(entry.sm) ?? slugFromImagePath(entry.lg);
      if (slug) return slug;
    }
  }

  if (typeof product.sku === "string" && product.sku.startsWith("CP-")) {
    return product.sku.slice(3).toLowerCase().replace(/_/g, "-");
  }

  return slugFromName(product.name);
}

function slugFromImagePath(value) {
  if (typeof value !== "string" || !value) return null;

  const localMatch = value.match(/^images\/([^/]+)\//);
  if (localMatch) return localMatch[1];

  const remoteMatch = value.match(/\/catering-packs\/([^/]+)\//);
  if (remoteMatch) return remoteMatch[1];

  return null;
}

function slugFromName(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function relativize(absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/");
}
