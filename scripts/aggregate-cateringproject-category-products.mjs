#!/usr/bin/env node
/**
 * Aggregate scraped Catering Project category markdown files into products.json.
 *
 * Reads:
 *   refs/cateringproject/categories.json
 *   refs/cateringproject/htmls/<category-slug>/*.jina.md
 *
 * Writes:
 *   refs/cateringproject/htmls/<category-slug>/products.json
 *
 * Notes:
 * - Dedupes products by canonical product URL.
 * - Aggregates source page numbers and source file names.
 * - Ignores the sample folder `morning-tea-sweet` by default.
 *
 * Usage:
 *   node scripts/aggregate-cateringproject-category-products.mjs
 *   node scripts/aggregate-cateringproject-category-products.mjs --slugs=morning-tea-savoury,breakfast-sweet
 *   node scripts/aggregate-cateringproject-category-products.mjs --limit=5
 *   node scripts/aggregate-cateringproject-category-products.mjs --include-sample
 *   node scripts/aggregate-cateringproject-category-products.mjs --categories refs/cateringproject/categories.json
 *   node scripts/aggregate-cateringproject-category-products.mjs --html-root refs/cateringproject/htmls
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_CATEGORIES_PATH = path.join(root, "refs/cateringproject/categories.json");
const DEFAULT_HTML_ROOT = path.join(root, "refs/cateringproject/htmls");
const DEFAULT_IGNORED = new Set(["morning-tea-sweet"]);

const args = process.argv.slice(2);
const options = parseArgs(args);
const categoriesPath = path.resolve(root, options.categoriesPath);
const htmlRoot = path.resolve(root, options.htmlRoot);

const HEADING_RE =
  /^### \[(.+?)\]\((https:\/\/www\.cateringproject\.com\.au\/[^\s)]+)(?:\s+"[^"]*")?\)$/;
const PRICE_RE = /^\$([\d,]+\.\d{2})\s*$/;
const IMAGE_RE = /^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/;
const DIETARY_RE = /\*\*([^*]+)\*\*/g;
const LINK_LINE_RE = /^\[([^\]]+)\]\(([^)]+)\)$/;

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
}

function main() {
  const categoryGroups = readJson(categoriesPath);
  const categoryMap = buildCategoryMap(categoryGroups);
  const folderSlugs = listCategoryFolders(htmlRoot);
  const targetSlugs = filterTargetSlugs(folderSlugs, options);

  const summary = {
    generated_at: new Date().toISOString(),
    categories_path: categoriesPath,
    html_root: htmlRoot,
    count: targetSlugs.length,
    ignored_sample: !options.includeSample,
    categories: [],
  };

  console.log(`Aggregating ${targetSlugs.length} category folders...`);

  for (const [index, slug] of targetSlugs.entries()) {
    const folder = path.join(htmlRoot, slug);
    const categoryMeta = categoryMap.get(slug) ?? {
      categoryGroup: "",
      category: slug,
      link: null,
    };

    const markdownFiles = fs
      .readdirSync(folder)
      .filter((file) => file.endsWith(".jina.md"))
      .sort(comparePageFiles);

    const recordsByUrl = new Map();

    for (const file of markdownFiles) {
      const filePath = path.join(folder, file);
      const page = inferPageFromFilename(file);
      const text = fs.readFileSync(filePath, "utf8");
      parseMarkdownFile(text, {
        fileName: file,
        page,
        categoryGroup: categoryMeta.categoryGroup,
        category: categoryMeta.category,
        recordsByUrl,
      });
    }

    const products = [...recordsByUrl.values()].sort(compareProducts);
    const payload = {
      category_group: categoryMeta.categoryGroup,
      category: categoryMeta.category,
      count: products.length,
      products,
    };

    const outputPath = path.join(folder, "products.json");
    fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

    summary.categories.push({
      slug,
      category_group: categoryMeta.categoryGroup,
      category: categoryMeta.category,
      source_link: categoryMeta.link,
      markdown_files: markdownFiles,
      count: products.length,
      output: relativizeToRoot(outputPath),
    });

    console.log(
      `[${index + 1}/${targetSlugs.length}] ${slug} -> ${products.length} products`,
    );
  }

  fs.writeFileSync(
    path.join(htmlRoot, "_category-products-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}

function parseArgs(inputArgs) {
  const result = {
    categoriesPath: relativizeToRoot(DEFAULT_CATEGORIES_PATH),
    htmlRoot: relativizeToRoot(DEFAULT_HTML_ROOT),
    slugs: null,
    limit: null,
    includeSample: false,
  };

  for (const arg of inputArgs) {
    if (arg === "--include-sample") result.includeSample = true;
    else if (arg.startsWith("--categories=")) {
      result.categoriesPath = arg.slice("--categories=".length);
    } else if (arg.startsWith("--html-root=")) {
      result.htmlRoot = arg.slice("--html-root=".length);
    } else if (arg.startsWith("--slugs=")) {
      const values = arg
        .slice("--slugs=".length)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      result.slugs = values.length ? new Set(values) : null;
    } else if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      result.limit = Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
    }
  }

  return result;
}

function buildCategoryMap(categoryGroups) {
  const map = new Map();

  for (const group of Array.isArray(categoryGroups) ? categoryGroups : []) {
    for (const category of Array.isArray(group.categories) ? group.categories : []) {
      if (!category?.slug) continue;
      map.set(category.slug, {
        categoryGroup: group.categoryGroup ?? "",
        category: category.name ?? category.slug,
        link: category.link ?? null,
      });
    }
  }

  return map;
}

function listCategoryFolders(targetRoot) {
  return fs
    .readdirSync(targetRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("."));
}

function filterTargetSlugs(folderSlugs, currentOptions) {
  let slugs = [...folderSlugs];

  if (!currentOptions.includeSample) {
    slugs = slugs.filter((slug) => !DEFAULT_IGNORED.has(slug));
  }

  if (currentOptions.slugs) {
    slugs = slugs.filter((slug) => currentOptions.slugs.has(slug));
  }

  slugs = slugs.filter((slug) => slug !== "product-htmls");

  if (currentOptions.limit) {
    slugs = slugs.slice(0, currentOptions.limit);
  }

  return slugs.sort((a, b) => a.localeCompare(b));
}

function comparePageFiles(a, b) {
  const pageDiff = inferPageFromFilename(a) - inferPageFromFilename(b);
  if (pageDiff !== 0) return pageDiff;
  return a.localeCompare(b);
}

function inferPageFromFilename(fileName) {
  const match = fileName.match(/-page-(\d+)\.jina\.md$/);
  return match ? Number(match[1]) : 1;
}

function parseMarkdownFile(
  text,
  { fileName, page, categoryGroup, category, recordsByUrl },
) {
  const lines = text.split(/\r?\n/);
  const startIndex = findCategoryHeadingIndex(lines, category);
  let index = startIndex >= 0 ? startIndex : 0;

  while (index < lines.length) {
    const headingLine = lines[index].trim();
    const headingMatch = headingLine.match(HEADING_RE);
    if (!headingMatch) {
      index += 1;
      continue;
    }

    const name = cleanText(headingMatch[1]);
    const url = cleanUrl(headingMatch[2]);
    const slug = url.split("/").pop() || name;

    let blockEnd = lines.length;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor].trim();
      if (HEADING_RE.test(candidate) || candidate === "Product listing being updated. Please wait.") {
        blockEnd = cursor;
        break;
      }
    }

    const blockLines = lines.slice(index, blockEnd);
    const image = findNearestImage(lines, index, startIndex);
    const product = buildProductRecord({
      slug,
      name,
      url,
      categoryGroup,
      category,
      page,
      fileName,
      blockLines,
      image,
    });

    mergeProduct(recordsByUrl, product);
    index = blockEnd;
  }
}

function findCategoryHeadingIndex(lines, category) {
  const wanted = `# ${category}`;
  return lines.findIndex((line) => line.trim() === wanted);
}

function findNearestImage(lines, headingIndex, lowerBound) {
  const minIndex = Math.max(0, lowerBound >= 0 ? lowerBound : headingIndex - 12);
  for (let cursor = headingIndex - 1; cursor >= minIndex; cursor -= 1) {
    const line = lines[cursor].trim();
    const match = line.match(IMAGE_RE);
    if (!match) continue;
    return {
      alt: cleanImageAlt(match[1]),
      url: cleanUrl(match[2]),
    };
  }
  return { alt: null, url: null };
}

function buildProductRecord({
  slug,
  name,
  url,
  categoryGroup,
  category,
  page,
  fileName,
  blockLines,
  image,
}) {
  const prices = [];
  let dietaries = [];
  let actionLabel = null;
  let description = null;

  for (const rawLine of blockLines.slice(1)) {
    const line = rawLine.trim();
    if (!line) continue;

    const priceMatch = line.match(PRICE_RE);
    if (priceMatch) {
      prices.push(priceMatch[1]);
      continue;
    }

    if (line.startsWith("**") && line.endsWith("**")) {
      const tokens = extractDietaryTokens(line);
      if (tokens.length) dietaries = tokens;
      continue;
    }

    const linkMatch = line.match(LINK_LINE_RE);
    if (linkMatch) {
      const text = cleanText(linkMatch[1]);
      if ((text === "Add to cart" || text === "Click to Order") && !actionLabel) {
        actionLabel = text;
      }
      continue;
    }

    if (
      line.startsWith("![") ||
      line.startsWith("[](") ||
      line === "add to favorites" ||
      line === "remove from favorites" ||
      line === "Recommended"
    ) {
      continue;
    }

    if (!description) {
      description = cleanText(line);
    }
  }

  if (description && description.startsWith(name)) {
    description = description.slice(name.length).trim().replace(/^[ -]+/, "") || description;
  }

  return {
    slug,
    name,
    url,
    category_group: categoryGroup,
    category,
    price: prices[0] ?? null,
    currency: "AUD",
    dietaries,
    image_url: image.url,
    image_alt: image.alt,
    action_label: actionLabel,
    description,
    source_pages: [page],
    source_files: [fileName],
  };
}

function mergeProduct(recordsByUrl, product) {
  const existing = recordsByUrl.get(product.url);
  if (!existing) {
    recordsByUrl.set(product.url, product);
    return;
  }

  if (!existing.price && product.price) existing.price = product.price;
  if (!existing.image_url && product.image_url) existing.image_url = product.image_url;
  if (!existing.image_alt && product.image_alt) existing.image_alt = product.image_alt;
  if (!existing.action_label && product.action_label) {
    existing.action_label = product.action_label;
  }
  if ((!existing.dietaries || existing.dietaries.length === 0) && product.dietaries.length) {
    existing.dietaries = product.dietaries;
  }
  if (!existing.description && product.description) existing.description = product.description;

  for (const page of product.source_pages) {
    if (!existing.source_pages.includes(page)) existing.source_pages.push(page);
  }
  for (const fileName of product.source_files) {
    if (!existing.source_files.includes(fileName)) existing.source_files.push(fileName);
  }

  existing.source_pages.sort((a, b) => a - b);
  existing.source_files.sort(comparePageFiles);
}

function compareProducts(a, b) {
  const pageA = a.source_pages[0] ?? Number.MAX_SAFE_INTEGER;
  const pageB = b.source_pages[0] ?? Number.MAX_SAFE_INTEGER;
  if (pageA !== pageB) return pageA - pageB;
  return a.name.localeCompare(b.name);
}

function extractDietaryTokens(line) {
  return [...line.matchAll(DIETARY_RE)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);
}

function cleanImageAlt(value) {
  return cleanText(String(value ?? "").replace(/^Image\s+\d+:\s*/i, ""));
}

function cleanUrl(value) {
  return cleanText(value);
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\ufffd/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relativizeToRoot(absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/");
}
