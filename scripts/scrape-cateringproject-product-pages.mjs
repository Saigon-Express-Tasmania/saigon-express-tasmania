#!/usr/bin/env node
/**
 * Scrape Catering Project product pages from a products.json listing.
 *
 * Default behavior: scrape mirrored markdown/html plus page images.
 * Optional behavior: generate metadata.json from the mirrored markdown.
 *
 * Usage:
 *   node scripts/scrape-cateringproject-product-pages.mjs
 *   node scripts/scrape-cateringproject-product-pages.mjs --with-metadata
 *   node scripts/scrape-cateringproject-product-pages.mjs --metadata-only
 *   node scripts/scrape-cateringproject-product-pages.mjs --slugs=sweet-croissant-platter,protein-ball-platter
 *   node scripts/scrape-cateringproject-product-pages.mjs --limit=5 --skip-existing
 *   node scripts/scrape-cateringproject-product-pages.mjs --products refs/cateringproject/htmls/morning-tea-sweet/products.json
 *   node scripts/scrape-cateringproject-product-pages.mjs --out refs/cateringproject/htmls/morning-tea-sweet/product-htmls
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_PRODUCTS_PATH = path.join(
  root,
  "refs/cateringproject/htmls/morning-tea-sweet/products.json",
);
const DEFAULT_OUTPUT_ROOT = path.join(
  root,
  "refs/cateringproject/htmls/morning-tea-sweet/product-htmls",
);
const DEFAULT_COLLECTION_URL =
  "https://www.cateringproject.com.au/morning-tea-sweet";

const args = process.argv.slice(2);
const options = parseArgs(args);

const productsPath = path.resolve(root, options.productsPath);
const outputRoot = path.resolve(root, options.outputRoot);
const mode = options.metadataOnly
  ? "metadata"
  : options.withMetadata
    ? "all"
    : "scrape";

const IMAGE_MD_RE = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
const PRICE_LINE_RE = /^\$([\d,]+\.\d{2})(?:\s*\+\s*GST)?\s*$/;
const DIETARY_TOKEN_RE = /\b(CN|V|VG|PS|H|DF|EF|GF|LF|NF|RF)\b/g;
const MIN_ORDER_RE =
  /(?:quantity of|qty of|minimum order of|minimum order quantity of)\s+(\d+)\s+and\s+above/i;
const SERVES_RE =
  /\b(serv(?:es|ing)|feeds?)\b[^.\n]*?(\d+\s*(?:[-–]\s*\d+)?\s*(?:people|guests)?)/i;
const LINK_MARKDOWN_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const STRIP_TAGS_RE = /<[^>]+>/g;

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});

async function main() {
  const productsPayload = readJson(productsPath);
  const allProducts = Array.isArray(productsPayload.products)
    ? productsPayload.products
    : [];
  const products = filterProducts(allProducts, options);

  fs.mkdirSync(outputRoot, { recursive: true });

  if (mode === "scrape" || mode === "all") {
    await runScrape(products);
  }

  if (mode === "metadata" || mode === "all") {
    runMetadata(products, productsPayload);
  }
}

function parseArgs(inputArgs) {
  const result = {
    productsPath: relativizeToRoot(DEFAULT_PRODUCTS_PATH),
    outputRoot: relativizeToRoot(DEFAULT_OUTPUT_ROOT),
    withMetadata: false,
    metadataOnly: false,
    skipExisting: false,
    force: false,
    limit: null,
    slugs: null,
  };

  for (const arg of inputArgs) {
    if (arg === "--with-metadata") result.withMetadata = true;
    else if (arg === "--metadata-only") result.metadataOnly = true;
    else if (arg === "--skip-existing") result.skipExisting = true;
    else if (arg === "--force") result.force = true;
    else if (arg.startsWith("--products=")) {
      result.productsPath = arg.slice("--products=".length);
    } else if (arg.startsWith("--out=")) {
      result.outputRoot = arg.slice("--out=".length);
    } else if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      result.limit = Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
    } else if (arg.startsWith("--slugs=")) {
      const values = arg
        .slice("--slugs=".length)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      result.slugs = values.length ? new Set(values) : null;
    }
  }

  if (result.metadataOnly) result.withMetadata = true;
  return result;
}

function relativizeToRoot(absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/");
}

function filterProducts(allProducts, currentOptions) {
  let products = allProducts.filter(
    (product) => product && typeof product.slug === "string" && product.slug,
  );

  if (currentOptions.slugs) {
    products = products.filter((product) => currentOptions.slugs.has(product.slug));
  }

  if (currentOptions.limit) {
    products = products.slice(0, currentOptions.limit);
  }

  return products;
}

async function runScrape(products) {
  const summary = {
    generated_at: new Date().toISOString(),
    mode: "scrape",
    products_path: productsPath,
    output_root: outputRoot,
    count: products.length,
    products: [],
  };

  console.log(`Scraping ${products.length} product pages...`);

  for (const [index, product] of products.entries()) {
    const folder = path.join(outputRoot, product.slug);
    const assetsDir = path.join(folder, "assets");
    fs.mkdirSync(assetsDir, { recursive: true });

    const mdPath = path.join(folder, `${product.slug}.jina.md`);
    const htmlPath = path.join(folder, `${product.slug}.jina.html`);
    const assetsManifestPath = path.join(folder, "assets.tsv");

    if (
      options.skipExisting &&
      fs.existsSync(mdPath) &&
      fs.existsSync(htmlPath) &&
      fs.existsSync(assetsManifestPath) &&
      !options.force
    ) {
      console.log(
        `[${index + 1}/${products.length}] ${product.slug} skipped (existing files)`,
      );
      summary.products.push({
        slug: product.slug,
        source_url: product.url,
        mirror_url: mirrorUrl(product.url),
        skipped: true,
      });
      continue;
    }

    const mirroredUrl = mirrorUrl(product.url);
    const mdText = await fetchText(mirroredUrl, { retries: 3, timeoutMs: 60000 });
    fs.writeFileSync(mdPath, mdText, "utf8");
    fs.writeFileSync(
      htmlPath,
      wrapMirroredHtml(product.url, product.name, mdText),
      "utf8",
    );

    const pageImages = extractImageEntries(mdText);
    const manifestLines = ["alt\turl\tfile\tstatus\tbytes"];
    const downloadedAssets = [];
    let imageOk = 0;
    let imageSkipped = 0;

    for (const [imageIndex, image] of pageImages.entries()) {
      const extName = extFromUrl(image.url) || ".bin";
      const fileBase = basenameFromUrl(image.url) || `image_${imageIndex + 1}`;
      const safeName = `${String(imageIndex + 1).padStart(3, "0")}_${sanitizeFilename(
        fileBase,
      )}${extName}`;
      const destination = path.join(assetsDir, safeName);

      try {
        const buffer = await fetchBuffer(image.url, {
          retries: 2,
          timeoutMs: 45000,
        });
        fs.writeFileSync(destination, buffer);
        manifestLines.push(
          `${sanitizeTsv(image.alt)}\t${sanitizeTsv(image.url)}\tassets/${safeName}\tOK\t${buffer.length}`,
        );
        downloadedAssets.push({
          alt: image.alt,
          url: image.url,
          file: `assets/${safeName}`,
          bytes: buffer.length,
        });
        imageOk += 1;
      } catch (error) {
        safeUnlink(destination);
        manifestLines.push(
          `${sanitizeTsv(image.alt)}\t${sanitizeTsv(image.url)}\tassets/${safeName}\tSKIP: ${sanitizeTsv(
            String(error?.message || error),
          )}\t0`,
        );
        imageSkipped += 1;
      }
    }

    fs.writeFileSync(`${assetsManifestPath}`, `${manifestLines.join("\n")}\n`, "utf8");

    summary.products.push({
      slug: product.slug,
      source_url: product.url,
      mirror_url: mirroredUrl,
      files: {
        markdown: relativizeToRoot(mdPath),
        html: relativizeToRoot(htmlPath),
        assets_manifest: relativizeToRoot(assetsManifestPath),
      },
      images_downloaded: imageOk,
      images_skipped: imageSkipped,
      downloaded_assets: downloadedAssets,
    });

    console.log(
      `[${index + 1}/${products.length}] ${product.slug} scraped (${imageOk} images, ${imageSkipped} skipped)`,
    );
  }

  fs.writeFileSync(
    path.join(outputRoot, "_scrape-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}

function runMetadata(products, productsPayload) {
  const summary = {
    generated_at: new Date().toISOString(),
    mode: "metadata",
    products_path: productsPath,
    output_root: outputRoot,
    count: products.length,
    category_group: productsPayload.category_group ?? null,
    category: productsPayload.category ?? null,
    products: [],
  };

  console.log(`Generating metadata for ${products.length} product pages...`);

  for (const [index, product] of products.entries()) {
    const folder = path.join(outputRoot, product.slug);
    const mdPath = path.join(folder, `${product.slug}.jina.md`);
    const assetsManifestPath = path.join(folder, "assets.tsv");
    const metadataPath = path.join(folder, "metadata.json");

    if (!fs.existsSync(mdPath)) {
      console.warn(
        `[${index + 1}/${products.length}] ${product.slug} metadata skipped (missing mirrored markdown)`,
      );
      summary.products.push({
        slug: product.slug,
        metadata_file: relativizeToRoot(metadataPath),
        skipped: true,
        reason: "missing mirrored markdown",
      });
      continue;
    }

    const mdText = fs.readFileSync(mdPath, "utf8");
    const metadata = buildMetadata(product, mdText, folder, assetsManifestPath);
    fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

    summary.products.push({
      slug: product.slug,
      metadata_file: relativizeToRoot(metadataPath),
      primary_image: metadata.product.image_url,
      includes_count: metadata.product.includes.length,
      min_order_qty: metadata.product.min_order_qty,
      customizations_disabled: metadata.product.customizations_disabled,
    });

    console.log(`[${index + 1}/${products.length}] ${product.slug} metadata ready`);
  }

  fs.writeFileSync(
    path.join(outputRoot, "_metadata-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}

function buildMetadata(product, mdText, localFolder, assetsManifestPath) {
  const lines = mdText.split(/\r?\n/);
  const pageImages = extractImageEntries(mdText);
  const detailImages = extractDetailImages(lines);
  const primaryImage = detailImages[0]?.url ?? product.image_url ?? null;
  const galleryImages = detailImages.slice(1).map((entry) => entry.url);

  const deliverySection = readSection(lines, isDeliveryHeading, isDescriptionHeading);
  const descriptionSection = readSection(
    lines,
    isDescriptionHeading,
    (line) => line.trim() === `# ${product.name}`,
  );
  const descriptionTextRaw =
    cleanText(joinContentLines(descriptionSection)) || cleanText(product.description || "");
  const { descriptionText, inlineNote } = splitNote(descriptionTextRaw);
  const deliveryText = cleanText(joinContentLines(deliverySection)) || null;

  const afterHeadingLines = lines.slice(findMainHeadingIndex(lines, product.name) + 1);
  const productPriceText = afterHeadingLines
    .map((line) => line.trim())
    .find((line) => PRICE_LINE_RE.test(line));
  const productPrice = productPriceText
    ? productPriceText.match(PRICE_LINE_RE)?.[1] ?? null
    : product.price ?? null;
  const priceWithGstText = afterHeadingLines
    .map((line) => line.trim())
    .find((line) => line.startsWith("$") && line.includes("GST"));
  const detailDietaries = extractDietaries(afterHeadingLines.join("\n"));
  const actionLabel = afterHeadingLines
    .map((line) => line.trim())
    .find((line) => line === "Add to cart" || line === "Click to Order");

  const includedItems = extractIncludedItems(lines);
  const includes = includedItems.map((item) => {
    const extras = [];
    if (item.qty) extras.push(`Qty: ${item.qty}`);
    if (item.dietaries.length) extras.push(`Dietaries: ${item.dietaries.join(", ")}`);
    return extras.length ? `${item.title} (${extras.join("; ")})` : item.title;
  });

  const minOrderQty =
    inferMinOrderQty(descriptionText) ||
    inferMinOrderQty(inlineNote) ||
    inferMinOrderQty(product.description) ||
    1;
  const serves =
    inferServes(descriptionText) ||
    inferServes(deliveryText) ||
    inferServes(product.description) ||
    null;
  const customizationHint =
    inferCustomizationHint(descriptionText) || inferCustomizationHint(inlineNote);
  const note = buildNote({
    deliveryText,
    inlineNote,
    minOrderQty,
  });

  const imageUrls = primaryImage ? { 1920: primaryImage } : {};
  if (galleryImages.length) {
    imageUrls.more = galleryImages.map((url) => ({ lg: url, sm: url }));
  }

  const downloadedAssets = readAssetsManifest(assetsManifestPath);

  return {
    source: {
      url: product.url,
      mirrored_url: mirrorUrl(product.url),
      vendor: "Catering Project",
      collection: DEFAULT_COLLECTION_URL,
      category_group: product.category_group ?? "Morning Tea",
      category: product.category ?? "Sweet",
      slug: product.slug,
      extracted_at: new Date().toISOString(),
      image_urls_original: {
        primary: primaryImage,
        gallery: galleryImages,
        page: pageImages.map((entry) => entry.url),
      },
      listing_snapshot: {
        price: product.price ?? null,
        dietaries: product.dietaries ?? [],
        description: product.description ?? null,
        source_pages: product.source_pages ?? [],
      },
      local_folder: localFolder,
      downloaded_assets: downloadedAssets,
    },
    product: {
      id: null,
      product_type: "catering",
      name: product.name,
      category: product.category ?? "Sweet",
      description: descriptionText,
      uom: "EACH",
      is_available: true,
      sort_order: 0,
      image_urls: imageUrls,
      price: productPrice ? `$${productPrice}` : "",
      unit_price: productPrice ? productPrice.replace(/,/g, "") : "",
      wholesale_price: null,
      prices: [],
      slug: "",
      related_items: [],
      is_popular: false,
      ingredients: [],
      sku: null,
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
      image_url: primaryImage,
      food_content: {},
      spicy_level: 0,
      energy: 0,
      customization_ids: [],
      customizations_disabled: !customizationHint,
    },
    product_customizations: [],
    mapping_notes: {
      dietaries: detailDietaries,
      price_with_gst_text: priceWithGstText ?? null,
      delivery_text: deliveryText,
      included_items: includedItems,
      all_page_images: pageImages,
      inferred_has_customization_choices: customizationHint,
      suggested_sku: `CP-${product.slug.toUpperCase().replace(/-/g, "_")}`,
      todo: [
        "Assign a real catering product id before SQL insert.",
        "Upload source images to Supabase Storage and replace product.image_urls / product.image_url with public URLs.",
        "Review whether this product needs product_customizations based on page copy.",
      ],
      source_products_seed: "supabase/migrations/20260528162000_products.sql",
    },
  };
}

function readAssetsManifest(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  const rows = lines.slice(1);
  return rows.map((row) => {
    const [alt = "", url = "", file = "", status = "", bytes = "0"] = row.split("\t");
    return {
      alt,
      url,
      file,
      status,
      bytes: Number(bytes) || 0,
    };
  });
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

function extractDetailImages(lines) {
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
      if (!url || seen.has(url) || isNoiseImage(alt, url)) continue;
      seen.add(url);
      images.push({ alt, url });
    }
  }

  return images;
}

function isNoiseImage(alt, url) {
  const lowerAlt = alt.toLowerCase();
  const lowerUrl = url.toLowerCase();
  return (
    lowerAlt.includes("logo") ||
    lowerAlt.includes("loading") ||
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

function mirrorUrl(sourceUrl) {
  return `https://r.jina.ai/http://${encodeURI(sourceUrl)}`;
}

async function fetchText(url, { retries = 3, timeoutMs = 60000 } = {}) {
  const response = await fetchWithRetry(url, { retries, timeoutMs });
  return response.text();
}

async function fetchBuffer(url, { retries = 2, timeoutMs = 45000 } = {}) {
  const response = await fetchWithRetry(url, { retries, timeoutMs });
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
}

async function fetchWithRetry(url, { retries = 3, timeoutMs = 60000 } = {}) {
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
        throw new Error(`HTTP ${response.status} ${url}`);
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

function wrapMirroredHtml(sourceUrl, title, markdownText) {
  const escaped = escapeHtml(markdownText);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)} - mirrored scrape</title>`,
    "<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;line-height:1.6}pre{white-space:pre-wrap;word-break:break-word}a{word-break:break-word}</style>",
    "</head>",
    "<body>",
    `<p><strong>Source:</strong> <a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a></p>`,
    "<p><strong>Note:</strong> Raw site HTML was Cloudflare-protected during scrape; this file is rendered from a mirrored text snapshot.</p>",
    `<pre>${escaped}</pre>`,
    "</body>",
    "</html>",
    "",
  ].join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeFilename(value) {
  return String(value ?? "")
    .replace(/\?.*$/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "asset";
}

function basenameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    return path.basename(pathname);
  } catch {
    return "";
  }
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    return path.extname(pathname);
  } catch {
    return "";
  }
}

function sanitizeTsv(value) {
  return String(value ?? "").replace(/\t/g, " ").replace(/[\r\n]+/g, " ").trim();
}

function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup errors
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
