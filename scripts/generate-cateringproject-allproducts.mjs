#!/usr/bin/env node
/**
 * Generate allproducts.json from scraped Catering Project category folders.
 *
 * Reads per category:
 *   refs/cateringproject/htmls/<category-slug>/products.json
 *   refs/cateringproject/htmls/<category-slug>/product-htmls/<product-slug>/*.jina.md
 *
 * Writes:
 *   refs/cateringproject/htmls/<category-slug>/allproducts.json
 *   refs/cateringproject/htmls/<category-slug>/images/<product-slug>/*
 *
 * Images are optimized with sharp:
 *   primary: 256, 512, 1024, 1920 (same as admin Menu.tsx)
 *   gallery: sm 256, lg 1920 (same as Menu.tsx additional images)
 * (supabase/migrations/20260528162000_products.sql plus customization columns).
 *
 * Usage:
 *   node scripts/generate-cateringproject-allproducts.mjs
 *   node scripts/generate-cateringproject-allproducts.mjs --category-slugs=afternoon-tea-disposables
 *   node scripts/generate-cateringproject-allproducts.mjs --start-id=620001
 *   node scripts/generate-cateringproject-allproducts.mjs --category refs/cateringproject/htmls/afternoon-tea-disposables
 *   node scripts/generate-cateringproject-allproducts.mjs --skip-existing
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_HTML_ROOT = path.join(root, "refs/cateringproject/htmls");
const DEFAULT_CATEGORIES_PATH = path.join(root, "refs/cateringproject/categories.json");
const DEFAULT_START_ID = 620001;
const PRIMARY_IMAGE_SIZES = [256, 512, 1024, 1920];
const ADDITIONAL_IMAGE_SM = 256;
const ADDITIONAL_IMAGE_LG = 1920;

const args = process.argv.slice(2);
const options = parseArgs(args);
const htmlRoot = path.resolve(root, options.htmlRoot);
const categoriesPath = path.resolve(root, options.categoriesPath);

const IMAGE_MD_RE = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
const PRICE_LINE_RE = /^\$([\d,]+\.\d{2})(?:\s*\+\s*GST)?\s*$/;
const DIETARY_TOKEN_RE = /\b(CN|V|VG|PS|H|DF|EF|GF|LF|NF|RF)\b/g;
const MIN_ORDER_RE =
  /(?:quantity of|qty of|minimum order of|minimum order quantity of)\s+(\d+)\s+and\s+above/i;
const SERVES_RE =
  /\b(serv(?:es|ing)|feeds?)\b[^.\n]*?(\d+\s*(?:[-–]\s*\d+)?\s*(?:people|guests)?)/i;
const LINK_MARKDOWN_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const STRIP_TAGS_RE = /<[^>]+>/g;
const TITLE_RE = /^Title:\s*(.+)$/;
const URL_SOURCE_RE = /^URL Source:\s*(.+)$/;
const PRICE_LIKE_RE = /^\$[\d,]+(?:\.\d{2})?$/;

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});

async function main() {
  const categoryLinkMap = buildCategoryLinkMap(readJson(categoriesPath));
  const categoryFolders = resolveCategoryFolders();
  let nextId = options.startId;

  const batchSummary = {
    generated_at: new Date().toISOString(),
    html_root: htmlRoot,
    categories_path: categoriesPath,
    start_id: options.startId,
    categories: [],
  };

  console.log(`Generating allproducts.json for ${categoryFolders.length} categories...`);

  for (const [index, categoryFolder] of categoryFolders.entries()) {
    const categorySlug = path.basename(categoryFolder);
    const productsJsonPath = path.join(categoryFolder, "products.json");
    if (!fs.existsSync(productsJsonPath)) {
      console.warn(`[${index + 1}/${categoryFolders.length}] ${categorySlug} skipped (missing products.json)`);
      continue;
    }

    const listingPayload = readJson(productsJsonPath);
    const listingBySlug = buildListingMap(listingPayload);
    const categoryMeta = categoryLinkMap.get(categorySlug) ?? null;
    const markdownFiles = findProductMarkdownFiles(categoryFolder);
    const rowsBySlug = new Map();

    for (const mdPath of markdownFiles) {
      const slug = inferSlugFromMarkdownPath(mdPath, categoryFolder);
      const listing = listingBySlug.get(slug) ?? null;
      const mdText = fs.readFileSync(mdPath, "utf8");
      const parsed = parseProductMarkdown(mdText, listing, {
        slug,
        categoryFolder,
        mdPath,
        categoryMeta,
        listingPayload,
      });
      rowsBySlug.set(parsed._meta.slug, parsed.row);
    }

    for (const [sortIndex, listing] of [...listingBySlug.values()].entries()) {
      if (rowsBySlug.has(listing.slug)) continue;
      const row = buildProductRowFromListing(listing, {
        sortOrder: sortIndex,
        categoryMeta,
        listingPayload,
        warnings: ["missing product detail markdown"],
      });
      rowsBySlug.set(listing.slug, row);
    }

    const productEntries = [...rowsBySlug.entries()]
      .map(([slug, row], sortIndex) => {
        const listingIndex = [...listingBySlug.keys()].indexOf(slug);
        const product = stripNonTableFields(row);
        product.sort_order = listingIndex >= 0 ? listingIndex : sortIndex;
        if (options.startId != null) {
          product.id = nextId;
          nextId += 1;
        }
        return { slug, product };
      })
      .sort(
        (a, b) =>
          a.product.sort_order - b.product.sort_order ||
          a.product.name.localeCompare(b.product.name),
      );

    const imageStats = await downloadCategoryImages(categoryFolder, productEntries);
    const products = productEntries.map(({ product }) => product);

    const outputPath = path.join(categoryFolder, "allproducts.json");
    fs.writeFileSync(outputPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");

    batchSummary.categories.push({
      category_slug: categorySlug,
      products_json: productsJsonPath,
      output: outputPath,
      images_root: path.join(categoryFolder, "images"),
      markdown_files: markdownFiles.length,
      listing_count: listingBySlug.size,
      product_count: products.length,
      images: imageStats,
    });

    console.log(
      `[${index + 1}/${categoryFolders.length}] ${categorySlug} wrote ${products.length} products, ${imageStats.downloaded} images downloaded (${imageStats.skipped} skipped, ${imageStats.failed} failed) -> ${relativize(outputPath)}`,
    );
  }

  fs.writeFileSync(
    path.join(htmlRoot, "_allproducts-batch-summary.json"),
    `${JSON.stringify(batchSummary, null, 2)}\n`,
    "utf8",
  );
}

function parseArgs(inputArgs) {
  const result = {
    htmlRoot: relativize(DEFAULT_HTML_ROOT),
    categoriesPath: relativize(DEFAULT_CATEGORIES_PATH),
    categoryPath: null,
    categorySlugs: null,
    startId: DEFAULT_START_ID,
    skipExisting: false,
  };

  for (const arg of inputArgs) {
    if (arg.startsWith("--html-root=")) {
      result.htmlRoot = arg.slice("--html-root=".length);
    } else if (arg.startsWith("--categories=")) {
      result.categoriesPath = arg.slice("--categories=".length);
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
    } else if (arg.startsWith("--start-id=")) {
      const value = Number(arg.slice("--start-id=".length));
      result.startId = Number.isFinite(value) ? Math.floor(value) : null;
    } else if (arg === "--no-ids") {
      result.startId = null;
    } else if (arg === "--skip-existing") {
      result.skipExisting = true;
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

function buildCategoryLinkMap(categoryGroups) {
  const map = new Map();
  for (const group of Array.isArray(categoryGroups) ? categoryGroups : []) {
    for (const category of Array.isArray(group.categories) ? group.categories : []) {
      if (!category?.slug) continue;
      map.set(category.slug, {
        categoryGroup: group.categoryGroup ?? "",
        categoryName: category.name ?? category.slug,
        link: category.link ?? null,
      });
    }
  }
  return map;
}

function buildListingMap(listingPayload) {
  const map = new Map();
  for (const product of Array.isArray(listingPayload.products) ? listingPayload.products : []) {
    if (!product?.slug) continue;
    map.set(product.slug, product);
  }
  return map;
}

function findProductMarkdownFiles(categoryFolder) {
  const productHtmlRoot = path.join(categoryFolder, "product-htmls");
  if (!fs.existsSync(productHtmlRoot)) return [];

  const files = [];
  walk(productHtmlRoot, (filePath) => {
    if (filePath.endsWith(".jina.md")) files.push(filePath);
  });
  return files.sort((a, b) => a.localeCompare(b));
}

function walk(dir, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, visitor);
    } else {
      visitor(fullPath);
    }
  }
}

function inferSlugFromMarkdownPath(mdPath, categoryFolder) {
  const relative = path.relative(path.join(categoryFolder, "product-htmls"), mdPath);
  const parts = relative.split(path.sep);
  if (parts.length > 1) return parts[0];
  return path.basename(mdPath, ".jina.md");
}

function parseProductMarkdown(mdText, listing, context) {
  const lines = mdText.split(/\r?\n/);
  const title = extractTitle(lines) ?? listing?.name ?? slugToTitle(context.slug);
  const sourceUrl = extractSourceUrl(lines) ?? listing?.url ?? null;
  const slug = listing?.slug ?? context.slug ?? slugFromUrl(sourceUrl) ?? context.slug;
  const name = title;
  const hasDetailContent = hasParseableDetailContent(lines, name);

  if (!hasDetailContent) {
    const row = buildProductRowFromListing(
      listing ?? {
        slug,
        name,
        url: sourceUrl,
        category: context.listingPayload.category,
        category_group: context.listingPayload.category_group,
        price: null,
        description: "",
        image_url: null,
        dietaries: [],
      },
      {
        sortOrder: 0,
        categoryMeta: context.categoryMeta,
        listingPayload: context.listingPayload,
        warnings: ["product markdown missing detail section; used listing data"],
      },
    );
    return { row, _meta: { slug } };
  }

  const pageImages = extractImageEntries(mdText);
  const detailImages = extractDetailImages(lines, name);
  const primaryImage = detailImages[0]?.url ?? listing?.image_url ?? null;
  const galleryImages = detailImages.slice(1).map((entry) => entry.url);

  const deliverySection = readSection(lines, isDeliveryHeading, isDescriptionHeading);
  const descriptionSection = readSection(
    lines,
    isDescriptionHeading,
    (line) => line.trim() === `# ${name}`,
  ).filter((line) => {
    const trimmed = line.trim();
    if (trimmed === "View More") return false;
    if (trimmed === `#### ${name}`) return false;
    if (trimmed.replace(/^#+\s+/, "") === name) return false;
    return true;
  });
  const descriptionTextRaw =
    cleanText(joinContentLines(descriptionSection)) ||
    cleanListingDescription(listing?.description) ||
    "";
  const { descriptionText, inlineNote } = splitNote(descriptionTextRaw);
  const deliveryText = cleanText(joinContentLines(deliverySection)) || null;

  const afterHeadingLines = lines.slice(findMainHeadingIndex(lines, name) + 1);
  const productPriceText = afterHeadingLines
    .map((line) => line.trim())
    .find((line) => PRICE_LINE_RE.test(line));
  const productPrice = productPriceText
    ? productPriceText.match(PRICE_LINE_RE)?.[1] ?? null
    : listing?.price ?? null;
  const detailDietaries = extractDietaries(afterHeadingLines.join("\n"));
  const includedItems = extractIncludedItems(lines);
  const includes = includedItems.map(formatIncludedItem);
  const minOrderQty =
    inferMinOrderQty(descriptionText) ||
    inferMinOrderQty(inlineNote) ||
    inferMinOrderQty(listing?.description) ||
    1;
  const serves =
    inferServes(descriptionText) ||
    inferServes(deliveryText) ||
    inferServes(listing?.description) ||
    null;
  const customizationHint =
    inferCustomizationHint(descriptionText) || inferCustomizationHint(inlineNote);
  const note = buildNote({ deliveryText, inlineNote, minOrderQty });
  const imageUrls = buildImageUrls(primaryImage, galleryImages);
  const categoryName =
    listing?.category ?? context.listingPayload.category ?? context.categoryMeta?.categoryName ?? "";

  const row = emptyProductRow({
    name,
    category: categoryName,
    description: descriptionText,
    sortOrder: 0,
    imageUrls,
    price: productPrice,
    minOrderQty,
    serves,
    includes,
    note,
    imageUrl: primaryImage,
    sku: suggestedSku(slug),
    customizationsDisabled: !customizationHint,
  });

  row._parse = {
    slug,
    source_url: sourceUrl,
    markdown_file: relativize(context.mdPath),
    dietaries: detailDietaries.length ? detailDietaries : listing?.dietaries ?? [],
    price_with_gst_text:
      afterHeadingLines
        .map((line) => line.trim())
        .find((line) => line.startsWith("$") && line.includes("GST")) ?? null,
    has_detail_markdown: true,
  };

  return { row, _meta: { slug } };
}

function buildProductRowFromListing(listing, context) {
  const slug = listing.slug;
  const description = cleanListingDescription(listing.description) || "";
  const row = emptyProductRow({
    name: listing.name,
    category: listing.category ?? context.listingPayload.category ?? context.categoryMeta?.categoryName ?? "",
    description,
    sortOrder: context.sortOrder ?? 0,
    imageUrls: listing.image_url ? { 1920: listing.image_url } : {},
    price: inferListingPrice(listing),
    minOrderQty: inferMinOrderQty(description) || 1,
    serves: inferServes(description),
    includes: [],
    note: null,
    imageUrl: listing.image_url ?? null,
    sku: suggestedSku(slug),
    customizationsDisabled: true,
  });

  row._parse = {
    slug,
    source_url: listing.url ?? null,
    markdown_file: null,
    dietaries: listing.dietaries ?? [],
    price_with_gst_text: null,
    has_detail_markdown: false,
    warnings: context.warnings ?? [],
  };

  return row;
}

function emptyProductRow({
  name,
  category,
  description,
  sortOrder,
  imageUrls,
  price,
  minOrderQty,
  serves,
  includes,
  note,
  imageUrl,
  sku,
  customizationsDisabled,
}) {
  const priceText = formatPriceText(price);
  const unitPrice = formatUnitPrice(price);

  return {
    id: null,
    product_type: "catering",
    name,
    category,
    description,
    uom: "EACH",
    is_available: true,
    sort_order: sortOrder,
    image_urls: imageUrls,
    price: priceText,
    unit_price: unitPrice,
    wholesale_price: null,
    prices: [],
    slug: "",
    related_items: [],
    is_popular: false,
    ingredients: [],
    sku,
    unit: "",
    daily_global_limit: null,
    daily_customer_limit: null,
    min_order_qty: minOrderQty,
    is_catch_weight: false,
    is_shippable: false,
    ship_weight_kg: null,
    ship_length_cm: null,
    ship_width_cm: null,
    ship_height_cm: null,
    serves,
    includes,
    tag: "",
    tag_bg: "",
    note,
    image_url: imageUrl,
    food_content: {},
    spicy_level: 0,
    energy: 0,
    customization_ids: [],
    customizations_disabled: customizationsDisabled,
  };
}

function buildImageUrls(primaryImage, galleryImages) {
  if (!primaryImage) return {};
  const imageUrls = { 1920: primaryImage };
  if (galleryImages.length) {
    imageUrls.more = galleryImages.map((url) => ({ lg: url, sm: url }));
  }
  return imageUrls;
}

function hasParseableDetailContent(lines, name) {
  const mainHeading = `# ${name}`;
  if (lines.some((line) => line.trim() === mainHeading)) return true;
  if (lines.some((line) => isDescriptionHeading(line.trim()))) return true;
  return lines.some((line) => line.trim().startsWith("###### This platter includes"));
}

function extractTitle(lines) {
  for (const line of lines) {
    const match = line.match(TITLE_RE);
    if (match) return cleanText(match[1]);
  }
  return null;
}

function extractSourceUrl(lines) {
  for (const line of lines) {
    const match = line.match(URL_SOURCE_RE);
    if (match) return cleanText(match[1]);
  }
  return null;
}

function slugFromUrl(url) {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
    return pathname || null;
  } catch {
    return null;
  }
}

function slugToTitle(slug) {
  return String(slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanListingDescription(value) {
  const text = cleanText(value);
  if (!text || PRICE_LIKE_RE.test(text)) return "";
  return text;
}

function inferListingPrice(listing) {
  if (listing?.price != null && listing.price !== "") return listing.price;
  const description = cleanText(listing?.description);
  if (!description || !PRICE_LIKE_RE.test(description)) return null;
  return description.replace(/^\$/, "").trim();
}

function formatIncludedItem(item) {
  const extras = [];
  if (item.qty) extras.push(`Qty: ${item.qty}`);
  if (item.dietaries.length) extras.push(`Dietaries: ${item.dietaries.join(", ")}`);
  return extras.length ? `${item.title} (${extras.join("; ")})` : item.title;
}

function formatPriceText(price) {
  if (price == null || price === "") return "";
  const normalized = String(price).replace(/,/g, "").trim();
  if (!normalized) return "";
  return normalized.startsWith("$") ? normalized : `$${normalized}`;
}

function formatUnitPrice(price) {
  if (price == null || price === "") return "";
  return String(price).replace(/,/g, "").replace(/^\$/, "").trim();
}

function suggestedSku(slug) {
  return `CP-${String(slug ?? "")
    .toUpperCase()
    .replace(/-/g, "_")}`;
}

function readSection(lines, startMatcher, stopMatcher) {
  const section = [];
  let capturing = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!capturing && startMatcher(line)) {
      capturing = true;
      continue;
    }
    if (!capturing) continue;
    if (stopMatcher(line)) break;
    if (!line) continue;
    section.push(line);
  }
  return section;
}

function isDeliveryHeading(line) {
  return (
    line === "#### Delivery ." ||
    line.startsWith("#### [Delivery .](") ||
    line === "### Delivery"
  );
}

function isDescriptionHeading(line) {
  return (
    line === "#### Description ." ||
    line.startsWith("#### [Description .](") ||
    line === "### Description"
  );
}

function findMainHeadingIndex(lines, name) {
  const exactHeading = `# ${name}`;
  const index = lines.findIndex((line) => line.trim() === exactHeading);
  return index >= 0 ? index : 0;
}

function extractIncludedItems(lines) {
  const items = [];
  const startIndex = lines.findIndex((line) =>
    line.trim().startsWith("###### This platter includes"),
  );
  if (startIndex < 0) return items;

  let current = null;
  for (const rawLine of lines.slice(startIndex + 1)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line === "### Related Products" || line.startsWith("NEXT DAY DELIVERY")) break;
    if (line === "Included") continue;
    if (line.startsWith("###### ")) {
      if (current) items.push(current);
      current = {
        title: line.replace(/^######\s+/, "").trim(),
        qty: null,
        dietaries: [],
      };
      continue;
    }
    if (!current) continue;
    if (line.startsWith("Qty:")) {
      current.qty = line.replace(/^Qty:\s*/, "").trim();
      continue;
    }
    const dietaries = extractDietaries(line);
    if (dietaries.length && current.dietaries.length === 0) {
      current.dietaries = dietaries;
    }
  }

  if (current) items.push(current);
  return items;
}

function extractImageEntries(markdownText) {
  const entries = [];
  const seen = new Set();
  for (const match of markdownText.matchAll(IMAGE_MD_RE)) {
    const alt = cleanText(match[1] ?? "");
    const url = cleanText(match[2] ?? "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    entries.push({ alt, url });
  }
  return entries;
}

function extractDetailImages(lines, productName) {
  const images = [];
  const seen = new Set();
  let beforeRelated = true;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "### Related Products") {
      beforeRelated = false;
    }
    if (!beforeRelated) continue;
    for (const match of line.matchAll(IMAGE_MD_RE)) {
      const alt = cleanText(match[1] ?? "");
      const url = cleanText(match[2] ?? "");
      if (!url || seen.has(url) || isNoiseImage(alt, url, productName)) continue;
      seen.add(url);
      images.push({ alt, url });
    }
  }

  return images;
}

function isNoiseImage(alt, url, productName) {
  const lowerAlt = alt.toLowerCase();
  const lowerUrl = url.toLowerCase();
  const lowerName = String(productName ?? "").toLowerCase();
  if (lowerAlt.includes("logo")) return true;
  if (lowerAlt.includes("loading")) return true;
  if (productName && lowerAlt.includes("image") && !lowerAlt.includes(lowerName)) {
    const altName = lowerAlt.replace(/^image \d+:\s*/, "").trim();
    if (altName && altName !== lowerName && !altName.includes(lowerName)) {
      return true;
    }
  }
  return (
    lowerUrl.includes("loading.gif") ||
    lowerUrl.includes("loading-2023.svg") ||
    lowerUrl.includes("cc-amex") ||
    lowerUrl.includes("cc-mastercard") ||
    lowerUrl.includes("cc-visa") ||
    lowerUrl.includes("select2-spinner") ||
    lowerUrl.includes("ajax-loader") ||
    lowerUrl.includes("favicon")
  );
}

function inferMinOrderQty(value) {
  if (!value) return null;
  const match = String(value).match(MIN_ORDER_RE);
  if (!match) return null;
  const quantity = Number(match[1]);
  return Number.isFinite(quantity) ? quantity : null;
}

function inferServes(value) {
  if (!value) return null;
  const match = String(value).match(SERVES_RE);
  return match ? cleanText(match[0]) : null;
}

function inferCustomizationHint(value) {
  if (!value) return false;
  return /\b(choose|select|options? include|choose between|mixed platter)\b/i.test(
    String(value),
  );
}

function extractDietaries(value) {
  if (!value) return [];
  const matches = String(value).replace(/\*/g, "").match(DIETARY_TOKEN_RE) ?? [];
  return [...new Set(matches.map((token) => token.trim()).filter(Boolean))];
}

function joinContentLines(lines) {
  return lines
    .map((line) =>
      line
        .replace(LINK_MARKDOWN_RE, "$1")
        .replace(STRIP_TAGS_RE, " ")
        .replace(/^#+\s+/g, "")
        .replace(/[*_`]+/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join(" ");
}

function splitNote(value) {
  if (!value) return { descriptionText: "", inlineNote: null };
  const marker = "Note:";
  const index = value.indexOf(marker);
  if (index < 0) {
    return { descriptionText: value.trim(), inlineNote: null };
  }
  const descriptionText = value.slice(0, index).trim();
  const inlineNote = `${marker} ${value.slice(index + marker.length).trim()}`.trim();
  return { descriptionText, inlineNote };
}

function buildNote({ deliveryText, inlineNote, minOrderQty }) {
  const parts = [];
  if (deliveryText) parts.push(deliveryText);
  if (inlineNote) parts.push(inlineNote);
  if (minOrderQty > 1) {
    parts.push(`Minimum order quantity inferred from page copy: ${minOrderQty}.`);
  }
  return parts.length ? cleanText(parts.join(" ")) : null;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\ufffd/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function relativize(absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/");
}

function stripNonTableFields(row) {
  const { _parse, ...product } = row;
  return product;
}

async function downloadCategoryImages(categoryFolder, productEntries) {
  const stats = {
    products: 0,
    downloaded: 0,
    skipped: 0,
    failed: 0,
  };

  for (const { slug, product } of productEntries) {
    const hasImages = product.image_url || Object.keys(product.image_urls ?? {}).length;
    if (!hasImages) continue;

    stats.products += 1;
    const productStats = await localizeProductImages(categoryFolder, slug, product);
    stats.downloaded += productStats.downloaded;
    stats.skipped += productStats.skipped;
    stats.failed += productStats.failed;
  }

  return stats;
}

async function localizeProductImages(categoryFolder, slug, product) {
  const stats = { downloaded: 0, skipped: 0, failed: 0 };
  const productImagesDir = path.join(categoryFolder, "images", slug);
  fs.mkdirSync(productImagesDir, { recursive: true });

  const originalImageUrls = product.image_urls ?? {};
  const primarySourceUrl = pickPrimarySourceUrl(product);
  const gallerySourceUrls = collectGallerySourceUrls(originalImageUrls, primarySourceUrl);
  const relativePrefix = `images/${slug}`;

  const localizedImageUrls = {};

  if (primarySourceUrl) {
    Object.assign(
      localizedImageUrls,
      await writePrimaryImageVariants({
        productImagesDir,
        slug,
        relativePrefix,
        sourceUrl: primarySourceUrl,
        stats,
      }),
    );
  }

  if (gallerySourceUrls.length) {
    localizedImageUrls.more = [];
    for (const [index, sourceUrl] of gallerySourceUrls.entries()) {
      localizedImageUrls.more.push(
        await writeGalleryImageVariants({
          productImagesDir,
          slug,
          relativePrefix,
          index,
          sourceUrl,
          stats,
        }),
      );
    }
  }

  if (Object.keys(localizedImageUrls).length) {
    product.image_urls = localizedImageUrls;
  }

  product.image_url =
    localizedImageUrls["1920"] ??
    localizedImageUrls["1024"] ??
    localizedImageUrls["512"] ??
    localizedImageUrls["256"] ??
    product.image_url ??
    null;

  return stats;
}

function pickPrimarySourceUrl(product) {
  const urls = product.image_urls ?? {};

  if (typeof urls["1920"] === "string" && isRemoteUrl(urls["1920"])) {
    return urls["1920"];
  }
  if (typeof product.image_url === "string" && isRemoteUrl(product.image_url)) {
    return product.image_url;
  }

  for (const size of [...PRIMARY_IMAGE_SIZES].sort((a, b) => b - a)) {
    const candidate = urls[String(size)];
    if (typeof candidate === "string" && isRemoteUrl(candidate)) {
      return candidate;
    }
  }

  return null;
}

function collectGallerySourceUrls(imageUrls, primaryUrl) {
  const urls = [];
  const seen = new Set();

  const add = (url) => {
    if (!isRemoteUrl(url)) return;
    if (primaryUrl && url === primaryUrl) return;
    if (seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  if (Array.isArray(imageUrls?.more)) {
    for (const entry of imageUrls.more) {
      add(entry.lg);
      add(entry.sm);
    }
  }

  return urls;
}

function isRemoteUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function variantExists(filePath) {
  return options.skipExisting && fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

async function writePrimaryImageVariants({
  productImagesDir,
  slug,
  relativePrefix,
  sourceUrl,
  stats,
}) {
  const localized = {};
  const pendingSizes = [];

  for (const size of PRIMARY_IMAGE_SIZES) {
    const fileName = `${slug}_${size}.jpg`;
    const destination = path.join(productImagesDir, fileName);
    const relativePath = `${relativePrefix}/${fileName}`;

    if (variantExists(destination)) {
      stats.skipped += 1;
      localized[String(size)] = relativePath;
    } else {
      pendingSizes.push(size);
    }
  }

  if (!pendingSizes.length) {
    return localized;
  }

  let sourceBuffer = null;
  try {
    sourceBuffer = await fetchBuffer(sourceUrl, { retries: 2, timeoutMs: 45000 });
  } catch (error) {
    stats.failed += pendingSizes.length;
    console.warn(
      `  ${slug}: primary image download failed (${sourceUrl}): ${String(error?.message || error)}`,
    );
    return localized;
  }

  for (const size of pendingSizes) {
    const fileName = `${slug}_${size}.jpg`;
    const destination = path.join(productImagesDir, fileName);
    const relativePath = `${relativePrefix}/${fileName}`;

    try {
      const buffer = await resizeBufferToJpeg(sourceBuffer, size);
      fs.writeFileSync(destination, buffer);
      stats.downloaded += 1;
      localized[String(size)] = relativePath;
    } catch (error) {
      stats.failed += 1;
      console.warn(
        `  ${slug}: primary resize failed (${size}px): ${String(error?.message || error)}`,
      );
    }
  }

  return localized;
}

async function writeGalleryImageVariants({
  productImagesDir,
  slug,
  relativePrefix,
  index,
  sourceUrl,
  stats,
}) {
  const smFileName = `${slug}-more-${index}-sm.jpg`;
  const lgFileName = `${slug}-more-${index}-lg.jpg`;
  const smDestination = path.join(productImagesDir, smFileName);
  const lgDestination = path.join(productImagesDir, lgFileName);
  const smRelative = `${relativePrefix}/${smFileName}`;
  const lgRelative = `${relativePrefix}/${lgFileName}`;

  const smReady = variantExists(smDestination);
  const lgReady = variantExists(lgDestination);

  if (smReady) stats.skipped += 1;
  if (lgReady) stats.skipped += 1;

  if (smReady && lgReady) {
    return { sm: smRelative, lg: lgRelative };
  }

  let sourceBuffer = null;
  try {
    sourceBuffer = await fetchBuffer(sourceUrl, { retries: 2, timeoutMs: 45000 });
  } catch (error) {
    stats.failed += (!smReady ? 1 : 0) + (!lgReady ? 1 : 0);
    console.warn(
      `  ${slug}: gallery image ${index} download failed (${sourceUrl}): ${String(error?.message || error)}`,
    );
    return {
      sm: smReady ? smRelative : sourceUrl,
      lg: lgReady ? lgRelative : sourceUrl,
    };
  }

  if (!smReady) {
    try {
      fs.writeFileSync(
        smDestination,
        await resizeBufferToJpeg(sourceBuffer, ADDITIONAL_IMAGE_SM),
      );
      stats.downloaded += 1;
    } catch (error) {
      stats.failed += 1;
      console.warn(
        `  ${slug}: gallery sm resize failed (${index}): ${String(error?.message || error)}`,
      );
    }
  }

  if (!lgReady) {
    try {
      fs.writeFileSync(
        lgDestination,
        await resizeBufferToJpeg(sourceBuffer, ADDITIONAL_IMAGE_LG),
      );
      stats.downloaded += 1;
    } catch (error) {
      stats.failed += 1;
      console.warn(
        `  ${slug}: gallery lg resize failed (${index}): ${String(error?.message || error)}`,
      );
    }
  }

  return {
    sm: fs.existsSync(smDestination) ? smRelative : sourceUrl,
    lg: fs.existsSync(lgDestination) ? lgRelative : sourceUrl,
  };
}

async function resizeBufferToJpeg(inputBuffer, maxSize) {
  return sharp(inputBuffer)
    .rotate()
    .resize({
      width: maxSize,
      height: maxSize,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function fetchBuffer(url, { retries = 2, timeoutMs = 45000 } = {}) {
  const response = await fetchWithRetry(url, { retries, timeoutMs });
  return Buffer.from(await response.arrayBuffer());
}

async function fetchWithRetry(url, { retries = 2, timeoutMs = 45000 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        },
      });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
