#!/usr/bin/env node
/**
 * Scrape R&S Sandwiches catering products from collection-product-links.json.
 * Writes refs/rssandwiches/{handle}.json per product (skips existing sample).
 *
 * Usage:
 *   node scripts/scrape-rssandwiches-catering-products.mjs
 *   node scripts/scrape-rssandwiches-catering-products.mjs --handles breakfast-croissant-platter,cold-drinks
 *   node scripts/scrape-rssandwiches-catering-products.mjs --upload-images
 *   node scripts/scrape-rssandwiches-catering-products.mjs --upload-images --skip-existing
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(root, "refs/rssandwiches");
const LINKS_PATH = path.join(OUT_DIR, "collection-product-links.json");
const SKIP_HANDLE = "gourmet-meat-sandwich-catering-platters";
const DPO_URL =
  "https://node1.itoris.com/dpo/storefront/include.js?controller=GetOptionConfig&shop=rssandwiches.myshopify.com";
const SHOP_BASE = "https://rssandwiches.com.au";

const START_PRODUCT_ID = 610082;
const START_CUSTOMIZATION_ID = 64;

function loadExistingIdCounters() {
  let maxProductId = START_PRODUCT_ID - 1;
  let maxCustomizationId = START_CUSTOMIZATION_ID - 1;

  if (!fs.existsSync(OUT_DIR)) {
    return { maxProductId, maxCustomizationId };
  }

  for (const file of fs.readdirSync(OUT_DIR)) {
    if (!file.endsWith(".json") || file === "collection-product-links.json") {
      continue;
    }
    try {
      const data = readJson(path.join(OUT_DIR, file));
      if (data.product?.id > maxProductId) maxProductId = data.product.id;
      for (const group of data.product_customizations ?? []) {
        if (group.id > maxCustomizationId) maxCustomizationId = group.id;
      }
    } catch {
      // ignore invalid drafts
    }
  }

  return { maxProductId, maxCustomizationId };
}

const args = process.argv.slice(2);
const uploadImages = args.includes("--upload-images");
const skipExisting = args.includes("--skip-existing");
const handlesArg = args.find((a) => a.startsWith("--handles="));
const filterHandles = handlesArg
  ? new Set(handlesArg.slice("--handles=".length).split(",").map((h) => h.trim()).filter(Boolean))
  : null;

const COLLECTION_PRIORITY = [
  "lunch",
  "breakfast-catering-melbourne",
  "breakfast",
  "canapes",
  "finger-food",
  "grazing-platters",
  "roast-catering-melbourne",
  "meals",
  "sweets",
  "breakfast-packs",
  "lunch-packs",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDpoInitialize(text) {
  const marker = "window.dpoOptions.initialize(";
  const start = text.indexOf(marker);
  if (start === -1) return { config: null, options: [] };

  function parseValue(fromIndex) {
    let i = fromIndex;
    while (i < text.length && /\s/.test(text[i])) i++;
    const ch = text[i];
    if (ch === "{") return parseBalanced(i, "{", "}");
    if (ch === "[") return parseBalanced(i, "[", "]");
    throw new Error(`Unexpected char at ${i}: ${ch}`);
  }

  function parseBalanced(startIndex, openCh, closeCh) {
    let i = startIndex + 1;
    let depth = 1;
    let inStr = false;
    let esc = false;
    let quote = "";
    const begin = startIndex;
    for (; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) {
          esc = false;
          continue;
        }
        if (ch === "\\") {
          esc = true;
          continue;
        }
        if (ch === quote) inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inStr = true;
        quote = ch;
        continue;
      }
      if (ch === openCh) depth++;
      if (ch === closeCh) {
        depth--;
        if (depth === 0) {
          return {
            value: JSON.parse(text.slice(begin, i + 1)),
            nextIndex: i + 1,
          };
        }
      }
    }
    throw new Error(`Unterminated ${openCh}`);
  }

  const first = parseValue(start + marker.length);
  let next = first.nextIndex;
  while (next < text.length && /\s/.test(text[next])) next++;
  if (text[next] === ",") {
    next++;
    const second = parseValue(next);
    return { config: first.value, options: second.value };
  }
  return { config: first.value, options: [] };
}

function decodeHtml(s) {
  return String(s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&bull;/g, "•")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function legendForOption(html, optionId) {
  const marker = `dynamic_option_id_${optionId}`;
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const before = html.slice(0, idx);
  const legends = [
    ...before.matchAll(/<h2 class="legend"[^>]*>([^<]+)<\/h2>/gi),
  ];
  if (!legends.length) return null;
  return cleanTitle(decodeHtml(legends[legends.length - 1][1]));
}

function extractServes(swatchhtml) {
  const text = decodeHtml(String(swatchhtml ?? ""));
  const match = text.match(/FEEDS up to ([^<]+)/i);
  return match ? `FEEDS up to ${match[1].trim()}` : "";
}

function optionItems(option) {
  return option.items ?? option.types ?? [];
}

function slugifyKey(text) {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .replace(/^(\d)/, "n_$1");
}

function cleanTitle(title) {
  return title
    .replace(/^step\s*\d+\s*:\s*/i, "")
    .replace(/\s*-\s*maximum\s*\d+\s*$/i, "")
    .trim();
}

function stripHtml(html) {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatPriceLabel(amount) {
  const n = parseMoney(amount);
  if (Number.isInteger(n)) return `$${n}`;
  return `$${n.toFixed(2).replace(/\.00$/, "")}`;
}

function shopifyImageUrls(images) {
  const img = images?.[0];
  if (!img?.src) return {};
  const base = img.src.split("?")[0];
  return {
    256: `${base}?width=300`,
    512: `${base}?width=600`,
    1024: `${base}?width=1024`,
    1920: base,
  };
}

function collectionSlug(url) {
  const m = url.match(/\/collections\/([^/?#]+)/);
  return m?.[1] ?? "";
}

function pickPrimaryCollection(handle, handleToCollections) {
  const collections = handleToCollections.get(handle) ?? [];
  for (const slug of COLLECTION_PRIORITY) {
    const hit = collections.find((c) => collectionSlug(c) === slug);
    if (hit) return hit;
  }
  return collections[0] ?? null;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchText(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

const collectionTitleCache = new Map();

async function getCollectionTitle(collectionUrl) {
  if (!collectionUrl) return "Catering";
  if (collectionTitleCache.has(collectionUrl)) {
    return collectionTitleCache.get(collectionUrl);
  }
  const slug = collectionSlug(collectionUrl);
  const data = await fetchJson(`${SHOP_BASE}/collections/${slug}.json`);
  const title = data.collection?.title ?? slug;
  collectionTitleCache.set(collectionUrl, title);
  return title;
}

function parseLimitsFromText(...parts) {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  let min = null;
  let max = null;

  const range = text.match(/choose\s+(\d+)\s*[–-]\s*(\d+)/);
  if (range) {
    min = Number(range[1]);
    max = Number(range[2]);
  }

  const atLeast = text.match(/(?:at least|minimum|min)\s+(\d+)/);
  if (atLeast) min = Number(atLeast[1]);

  const upTo = text.match(/(?:up to|maximum|max)\s+(\d+)/);
  if (upTo) max = Number(upTo[1]);

  const maxOnly = text.match(/maximum\s+(\d+)/);
  if (maxOnly && max == null) max = Number(maxOnly[1]);

  const selectUpTo = text.match(/select\s+up\s+to\s+(\d+)/);
  if (selectUpTo) max = Number(selectUpTo[1]);

  const selectAtLeast = text.match(/select\s+at\s+least\s+(\d+)/);
  if (selectAtLeast) min = Number(selectAtLeast[1]);

  return { min, max };
}

function optionHtmlBlock(html, optionId) {
  const marker = `dynamic_option_id_${optionId}`;
  const idx = html.indexOf(marker);
  if (idx < 0) return "";
  return html.slice(idx, idx + 4000);
}

function parseLimitsFromExtraJs(extraJs, optionTitle) {
  const text = String(extraJs ?? "");
  const title = optionTitle.toLowerCase();
  let min = null;
  let max = null;

  const classHint = text.match(/\.max(\d+)/i);
  if (classHint) max = Number(classHint[1]);

  const maxAlert = text.match(/select\s+up\s+to\s+(\d+)/i);
  if (maxAlert) max = Number(maxAlert[1]);

  const minAlert = text.match(/select\s+at\s+least\s+(\d+)/i);
  if (minAlert) min = Number(minAlert[1]);

  if (/filling/i.test(title) || /filling/i.test(text)) {
    const fillMin = text.match(/at\s+least\s+(\d+)\s+fillings?/i);
    if (fillMin) min = Number(fillMin[1]);
  }

  return { min, max };
}

function resolveMultiLimits({
  option,
  productBody,
  extraJs,
  dpoHtml,
  legendTitle,
}) {
  const optionHtml = dpoHtml ? optionHtmlBlock(dpoHtml, option.id) : "";
  const limitText = [legendTitle, option.title].filter(Boolean).join(" ");
  const fromTitle = parseLimitsFromText(limitText);
  const fromBody = parseLimitsFromText(productBody);
  const maxClass = optionHtml.match(/class="[^"]*max(\d+)/i);
  const maxFromClass = maxClass ? Number(maxClass[1]) : null;

  let min = fromTitle.min ?? fromBody.min;
  let max = fromTitle.max ?? fromBody.max ?? maxFromClass;

  const appliesJsLimits =
    maxFromClass != null ||
    /maximum/i.test(limitText) ||
    /up to \d+/i.test(limitText) ||
    /choose \d+\s*[–-]\s*\d+/i.test(limitText) ||
    /at least \d+/i.test(limitText) ||
    /filling/i.test(limitText);

  if (appliesJsLimits) {
    const fromJs = parseLimitsFromExtraJs(extraJs, limitText);
    if (fromJs.min != null) min = fromJs.min;
    if (fromJs.max != null) max = fromJs.max;
    if (maxFromClass != null && max == null) max = maxFromClass;
  }

  const dpoMin = Number(option.min_qty);
  const dpoMax = Number(option.max_qty);
  if (Number.isFinite(dpoMin) && dpoMin > 0) min = dpoMin;
  if (Number.isFinite(dpoMax) && dpoMax > 0) max = dpoMax;

  const isLimited = (min != null && min > 0) || (max != null && max > 0);
  return {
    is_multi_limited: isLimited,
    min_options: isLimited && min != null ? min : 0,
    max_options: isLimited && max != null ? max : 0,
  };
}

function mapDpoType(option) {
  const type = String(option.type ?? "").toLowerCase();
  const isMulti = type.includes("checkbox") || type === "multiple";
  return isMulti ? "multi" : "single";
}

function isPricedTierOption(option) {
  const items = optionItems(option);
  if (items.length === 0) return false;
  const hasPositivePrice = items.some((t) => parseMoney(t.price) > 0);
  if (!hasPositivePrice) return false;
  const type = String(option.type ?? "").toLowerCase();
  if (
    type.includes("dropdown") ||
    type.includes("drop_down") ||
    type.includes("radio") ||
    type.includes("select")
  ) {
    return true;
  }
  if (
    (type.includes("checkbox") || type === "multiple") &&
    items.every((t) => parseMoney(t.price) > 0)
  ) {
    return true;
  }
  return false;
}

function isCustomizationOption(option) {
  const items = optionItems(option);
  if (items.length === 0) return false;
  if (isPricedTierOption(option)) return false;
  return items.every((t) => parseMoney(t.price) === 0);
}

function buildPricesFromOption(option) {
  return optionItems(option).map((t, index) => ({
    size: String(t.title ?? "").trim(),
    price: String(parseMoney(t.price)),
    serves: extractServes(t.swatchhtml),
    sort_order: (index + 1) * 10,
    source_option_type_id: t.option_type_id ?? t.id ?? null,
  }));
}

function buildCustomizationFromOption({
  option,
  handle,
  sortOrder,
  customizationId,
  productBody,
  extraJs,
  dpoHtml,
  legendTitle,
}) {
  const type = mapDpoType(option);
  const required =
    option.is_require === 1 ||
    option.is_require === true ||
    String(option.is_require) === "1";
  const limits =
    type === "multi"
      ? resolveMultiLimits({
          option,
          productBody,
          extraJs,
          dpoHtml,
          legendTitle,
        })
      : {
          is_multi_limited: false,
          min_options: 0,
          max_options: 0,
        };

  const displayTitle =
    legendTitle || cleanTitle(option.title) || `Option ${option.id}`;
  const topic =
    slugifyKey(displayTitle).slice(0, 40) || `step_${option.id}`;
  const key = `rss_${handle.replace(/-/g, "_")}_${topic}`.slice(0, 80);

  return {
    id: customizationId,
    kind: "catering",
    key,
    title: displayTitle,
    type,
    required,
    sort_order: sortOrder,
    ...limits,
    source_step: legendTitle ?? option.title,
    source_option_id: option.id,
    options: optionItems(option).map((t, index) => ({
      id: null,
      key:
        slugifyKey(t.title) ||
        `option_${t.option_type_id ?? t.id ?? index + 1}`,
      title: String(t.title ?? "").trim(),
      price: parseMoney(t.price),
      sort_order: (index + 1) * 10,
      source_option_type_id: t.option_type_id ?? t.id ?? null,
    })),
  };
}

function shortSku(handle, vendorSku) {
  const parts = handle
    .split("-")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 6);
  const base = vendorSku ? String(vendorSku).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) : parts;
  return `RSS-${base || "ITEM"}-${parts || "CAT"}`;
}

function buildServesSummary(prices, lowestPrice) {
  const first = prices[0];
  if (!first) return null;
  const serves = first.serves?.trim();
  if (serves) {
    return `From ${formatPriceLabel(lowestPrice)} | ${serves.replace(/^feeds\s+/i, "1 tier feeds ")}`;
  }
  return `From ${formatPriceLabel(lowestPrice)}`;
}

async function scrapeProduct({
  handle,
  collectionUrl,
  productId,
  nextCustomizationId,
  existingCustomizationIds = new Map(),
}) {
  const productUrl = `${SHOP_BASE}/products/${handle}`;
  const shopify = await fetchJson(`${productUrl}.json`);
  const p = shopify.product;
  const variant =
    p.variants?.find(
      (v) =>
        v.title &&
        !v.title.includes("D#") &&
        v.title !== "Default Title",
    ) ?? p.variants?.[0];

  const dpoText = await fetchText(DPO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      product_id: String(p.id),
      variant_id: String(variant?.id ?? p.variants?.[0]?.id ?? ""),
      customer_id: "0",
    }),
  });
  const { config: dpo, options: dpoOptions } = parseDpoInitialize(dpoText);
  const extraJs = dpo?.extra_js ?? "";
  const productBody = stripHtml(p.body_html);

  const prices = [];
  const customizations = [];
  let customizationId = nextCustomizationId;
  let maxCustomizationId = nextCustomizationId - 1;

  for (const option of dpoOptions) {
    const type = String(option.type ?? "").toLowerCase();
    if (type === "html" || type === "static") continue;
    if (isPricedTierOption(option)) {
      prices.push(...buildPricesFromOption(option));
      continue;
    }
    if (isCustomizationOption(option)) {
      const legendTitle = legendForOption(dpoText, option.id);
      const existingGroupId = existingCustomizationIds.get(option.id);
      const groupId = existingGroupId ?? customizationId++;
      maxCustomizationId = Math.max(maxCustomizationId, groupId);
      customizations.push(
        buildCustomizationFromOption({
          option,
          handle,
          sortOrder: (customizations.length + 1) * 10,
          customizationId: groupId,
          productBody,
          extraJs,
          dpoHtml: dpoText,
          legendTitle,
        }),
      );
    }
  }

  if (prices.length === 0) {
    const shopifyTiers = (p.variants ?? [])
      .filter(
        (v) =>
          v.title &&
          !v.title.includes("D#") &&
          v.title !== "Default Title" &&
          parseMoney(v.price) > 0,
      )
      .map((v, index) => ({
        size: v.title,
        price: String(parseMoney(v.price)),
        serves: "",
        sort_order: (index + 1) * 10,
      }));
    if (shopifyTiers.length > 0) {
      prices.push(...shopifyTiers);
    }
  }

  const sortedPrices = prices.sort((a, b) => parseMoney(a.price) - parseMoney(b.price));
  const lowestPrice =
    sortedPrices[0]?.price ??
    variant?.price ??
    p.variants?.find((v) => parseMoney(v.price) > 0)?.price ??
    "0";

  const category = await getCollectionTitle(collectionUrl);
  const imageUrls = shopifyImageUrls(p.images);

  const noteParts = [];
  if (productBody && productBody.length < 280) noteParts.push(productBody);
  for (const group of customizations) {
    if (group.is_multi_limited) {
      const min = group.min_options;
      const max = group.max_options;
      if (min > 0 && max > 0) {
        noteParts.push(`${group.title}: choose ${min}–${max}.`);
      } else if (max > 0) {
        noteParts.push(`${group.title}: up to ${max}.`);
      } else if (min > 0) {
        noteParts.push(`${group.title}: at least ${min}.`);
      }
    }
  }

  const product = {
    id: productId,
    product_type: "catering",
    name: p.title,
    category,
    description: stripHtml(p.body_html),
    uom: "EACH",
    is_available: true,
    sort_order: 0,
    image_urls: imageUrls,
    price: formatPriceLabel(lowestPrice),
    unit_price: String(parseMoney(lowestPrice)),
    wholesale_price: null,
    prices: sortedPrices.map(({ size, price, serves }) => ({ size, price, serves })),
    slug: "",
    related_items: [],
    is_popular: false,
    ingredients: [],
    sku: shortSku(handle, variant?.sku || p.variants?.[0]?.sku),
    unit: "",
    daily_global_limit: null,
    daily_customer_limit: null,
    min_order_qty: 1,
    is_catch_weight: false,
    is_shippable: false,
    ship_weight_kg: null,
    ship_length_cm: null,
    ship_width_cm: null,
    ship_height_cm: null,
    serves: buildServesSummary(sortedPrices, lowestPrice),
    includes: [],
    tag: "",
    tag_bg: "",
    note: [...new Set(noteParts)].join(" ").trim(),
    image_url: imageUrls["1920"] ?? imageUrls["1024"] ?? "",
    food_content: {},
    spicy_level: 0,
    energy: 0,
    customization_ids: customizations.map((g) => g.id),
    customizations_disabled: customizations.length === 0,
  };

  return {
    source: {
      url: productUrl,
      shopify_product_id: p.id,
      shopify_handle: handle,
      collection: collectionUrl,
      vendor: p.vendor,
      sku: variant?.sku ?? p.variants?.[0]?.sku ?? "",
      extracted_at: new Date().toISOString().slice(0, 10),
      image_urls_original: imageUrls,
    },
    product,
    product_customizations: customizations,
    mapping_notes: {
      prices_field:
        sortedPrices.length > 0
          ? "DPO priced dropdown/radio steps map to products.prices."
          : "No priced DPO tiers; using Shopify variant price.",
      customizations_field:
        customizations.length > 0
          ? "DPO zero-price checkbox/radio groups map to product_customizations."
          : "No DPO customization groups.",
      customization_limits:
        customizations.length > 0
          ? customizations
              .map((g) =>
                g.is_multi_limited
                  ? `${g.key}: min=${g.min_options} max=${g.max_options}`
                  : `${g.key}: unlimited multi`,
              )
              .join("; ")
          : "n/a",
      dpo: "Options from IToris DPO GetOptionConfig.",
    },
    _nextCustomizationId: maxCustomizationId + 1,
  };
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function loadHandleMap() {
  const links = readJson(LINKS_PATH);
  const handleToCollections = new Map();
  for (const entry of links.collections ?? []) {
    for (const productUrl of entry.products ?? []) {
      const handle = productUrl.split("/products/")[1]?.replace(/\/$/, "");
      if (!handle) continue;
      const list = handleToCollections.get(handle) ?? [];
      list.push(entry.collection);
      handleToCollections.set(handle, list);
    }
  }
  return handleToCollections;
}

function runUpload(jsonPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(root, "scripts/upload-rssandwiches-catering-image.mjs"), jsonPath],
      { stdio: "inherit", cwd: root },
    );
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`upload failed for ${jsonPath} (exit ${code})`));
    });
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const handleToCollections = loadHandleMap();

  let handles = [...handleToCollections.keys()]
    .filter((h) => h !== SKIP_HANDLE)
    .sort();

  if (filterHandles) {
    handles = handles.filter((h) => filterHandles.has(h));
  }

  if (skipExisting) {
    handles = handles.filter(
      (h) => !fs.existsSync(path.join(OUT_DIR, `${h}.json`)),
    );
  }

  console.log(`Scraping ${handles.length} products (skip: ${SKIP_HANDLE})`);

  const { maxProductId, maxCustomizationId } = loadExistingIdCounters();
  let productId = maxProductId + 1;
  let customizationId = maxCustomizationId + 1;
  const written = [];

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];
    const collectionUrl = pickPrimaryCollection(handle, handleToCollections);
    process.stdout.write(`[${i + 1}/${handles.length}] ${handle} ... `);

    try {
      const outPath = path.join(OUT_DIR, `${handle}.json`);
      const existing = fs.existsSync(outPath) ? readJson(outPath) : null;
      const existingCustomizationIds = new Map(
        (existing?.product_customizations ?? []).map((group) => [
          group.source_option_id,
          group.id,
        ]),
      );
      const assignedProductId = existing?.product?.id ?? productId;

      const data = await scrapeProduct({
        handle,
        collectionUrl,
        productId: assignedProductId,
        nextCustomizationId: customizationId,
        existingCustomizationIds,
      });
      customizationId = data._nextCustomizationId;
      delete data._nextCustomizationId;

      fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
      written.push(outPath);
      if (!existing) productId += 1;
      console.log(
        `ok (id ${data.product.id}, ${data.product.prices.length} tiers, ${data.product_customizations.length} groups)`,
      );

      if (uploadImages) {
        await runUpload(path.relative(root, outPath));
      }

      await sleep(350);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  console.log(`\nWrote ${written.length} JSON files to refs/rssandwiches/`);
  if (!uploadImages) {
    console.log(
      "Run with --upload-images to upload Supabase Storage images for each file.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
