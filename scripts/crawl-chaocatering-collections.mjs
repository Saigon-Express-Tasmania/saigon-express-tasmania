/**
 * Crawl https://chaocatering.com.au/collections, its level-1 child collection pages,
 * and product pages linked from those collection pages.
 * Downloads HTML, images, stylesheets, and Shopify JSON data into refs/chaocatering/.
 *
 * Usage: node scripts/crawl-chaocatering-collections.mjs
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_ROOT = path.join(ROOT, "refs", "chaocatering");

const BASE = "https://chaocatering.com.au";
const ORIGIN = new URL(BASE).origin;
const USER_AGENT = "saigon-express-tasmania-ref-crawler/1.0";

const ASSET_HOSTS = new Set([
  ORIGIN,
  "https://chaocatering.com.au",
  "https://cdn.shopify.com",
  "https://cdn.shopifycdn.net",
]);

/** @type {Map<string, string>} absolute URL -> relative path from OUT_ROOT */
const assetMap = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha1(input) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 12);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeUrl(raw, pageUrl) {
  if (!raw || raw.startsWith("data:") || raw.startsWith("javascript:") || raw.startsWith("#")) {
    return null;
  }
  if (raw.startsWith("//")) raw = `https:${raw}`;
  try {
    const url = new URL(raw, pageUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function isLevel1CollectionUrl(url) {
  const parsed = new URL(url);
  if (parsed.origin !== ORIGIN) return false;
  const parts = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  return parts.length === 2 && parts[0] === "collections" && parts[1] !== "all";
}

function isProductUrl(url) {
  const parsed = new URL(url);
  if (parsed.origin !== ORIGIN) return false;
  const parts = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  return parts.length === 2 && parts[0] === "products";
}

function pageSlugFromUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "collections") return "collections";
  if (parts.length === 2 && parts[0] === "collections") return `collections/${parts[1]}`;
  if (parts.length === 2 && parts[0] === "products") return `products/${parts[1]}`;
  return parts.join("/") || "index";
}

function pageOutputPath(slug) {
  if (slug === "collections") return path.join(OUT_ROOT, "pages", "collections.html");
  return path.join(OUT_ROOT, "pages", `${slug}.html`);
}

function relativeAssetPath(fromFile, assetRelFromRoot) {
  const fromDir = path.dirname(fromFile);
  return path.relative(fromDir, path.join(OUT_ROOT, assetRelFromRoot)).replace(/\\/g, "/");
}

function extFromUrl(url, contentType) {
  const pathname = new URL(url).pathname;
  const fromPath = path.extname(pathname).toLowerCase();
  if (fromPath && fromPath.length <= 6) return fromPath;

  if (!contentType) return ".bin";
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("css")) return ".css";
  if (contentType.includes("json")) return ".json";
  if (contentType.includes("html")) return ".html";
  return ".bin";
}

function assetKind(url, contentType) {
  const ext = extFromUrl(url, contentType);
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".ico"].includes(ext)) return "images";
  if (ext === ".css") return "css";
  if (ext === ".js") return "js";
  if (ext === ".json") return "json";
  return "misc";
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return { text: await res.text(), contentType: res.headers.get("content-type") ?? "" };
}

async function fetchBinary(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}

async function downloadAsset(url) {
  const existing = assetMap.get(url);
  if (existing) return existing;

  let buffer;
  let contentType;
  try {
    ({ buffer, contentType } = await fetchBinary(url));
  } catch (err) {
    console.warn(`skip asset: ${url} (${err.message})`);
    return url;
  }
  const kind = assetKind(url, contentType);
  const ext = extFromUrl(url, contentType);
  const filename = `${sha1(url)}${ext}`;
  const rel = path.posix.join("assets", kind, filename);
  const abs = path.join(OUT_ROOT, rel);
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, buffer);
  assetMap.set(url, rel);
  return rel;
}

function shouldDownloadAsset(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const allowed = [...ASSET_HOSTS].some((origin) => new URL(origin).hostname === host);
    if (!allowed) return false;

    const pathname = parsed.pathname;
    const ext = path.extname(pathname).toLowerCase();
    const assetExts = new Set([
      ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".ico",
      ".css", ".js", ".woff", ".woff2", ".ttf", ".eot",
    ]);
    if (assetExts.has(ext)) return true;

    // Shopify CDN image URLs often have no extension but include /files/ or /products/
    if (host.includes("shopify") && /\/(files|products|collections)\//.test(pathname)) return true;

    // Theme assets on the shop CDN path
    if (host === new URL(ORIGIN).hostname && /\/cdn\/shop\//.test(pathname)) return true;

    return false;
  } catch {
    return false;
  }
}

function extractUrlsFromHtml(html, pageUrl) {
  const urls = new Set();

  const attrPatterns = [
    /\s(?:src|href|poster|data-src|data-original|data-bgset)\s*=\s*["']([^"']+)["']/gi,
    /\ssrcset\s*=\s*["']([^"']+)["']/gi,
  ];

  for (const pattern of attrPatterns) {
    for (const match of html.matchAll(pattern)) {
      const value = match[1];
      if (pattern.source.includes("srcset")) {
        for (const part of value.split(",")) {
          const candidate = part.trim().split(/\s+/)[0];
          const normalized = normalizeUrl(candidate, pageUrl);
          if (normalized) urls.add(normalized);
        }
      } else {
        const normalized = normalizeUrl(value, pageUrl);
        if (normalized) urls.add(normalized);
      }
    }
  }

  for (const match of html.matchAll(
    /<meta[^>]+property=["'](?:og:image|og:image:secure_url|twitter:image)["'][^>]+content=["']([^"']+)["']/gi,
  )) {
    const normalized = normalizeUrl(match[1], pageUrl);
    if (normalized) urls.add(normalized);
  }

  for (const match of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    const normalized = normalizeUrl(match[1], pageUrl);
    if (normalized) urls.add(normalized);
  }

  return urls;
}

function extractLevel1CollectionLinks(html, pageUrl) {
  const links = new Set();
  for (const match of html.matchAll(/\shref\s*=\s*["']([^"']+)["']/gi)) {
    const normalized = normalizeUrl(match[1], pageUrl);
    if (normalized && isLevel1CollectionUrl(normalized)) links.add(normalized);
  }
  return [...links];
}

function extractProductLinks(html, pageUrl) {
  const links = new Set();
  for (const match of html.matchAll(/\shref\s*=\s*["']([^"']+)["']/gi)) {
    const normalized = normalizeUrl(match[1], pageUrl);
    if (normalized && isProductUrl(normalized)) links.add(normalized);
  }
  return [...links];
}

async function rewriteHtmlAssets(html, pageUrl, outputFile) {
  let rewritten = html;
  const urls = [...extractUrlsFromHtml(html, pageUrl)].filter(shouldDownloadAsset);

  for (const url of urls) {
    const relAsset = await downloadAsset(url);
    const localRef = relativeAssetPath(outputFile, relAsset);
    rewritten = rewritten.split(url).join(localRef);
    rewritten = rewritten.split(url.replace(/&/g, "&amp;")).join(localRef);
  }

  // Rewrite same-site page links to local HTML files.
  rewritten = rewritten.replace(/\shref\s*=\s*["']([^"']+)["']/gi, (full, rawHref) => {
    const normalized = normalizeUrl(rawHref, pageUrl);
    if (!normalized) return full;
    const parsed = new URL(normalized);
    if (parsed.origin !== ORIGIN) return full;

    if (parsed.pathname.replace(/\/+$/, "") === "/collections") {
      const local = relativeAssetPath(outputFile, "pages/collections.html");
      return ` href="${local}"`;
    }

    if (isLevel1CollectionUrl(normalized)) {
      const slug = pageSlugFromUrl(normalized);
      const local = relativeAssetPath(outputFile, `pages/${slug}.html`);
      return ` href="${local}"`;
    }

    if (isProductUrl(normalized)) {
      const slug = pageSlugFromUrl(normalized);
      const local = relativeAssetPath(outputFile, `pages/${slug}.html`);
      return ` href="${local}"`;
    }

    return full;
  });

  return rewritten;
}

async function rewriteCssAssets(css, cssUrl) {
  let rewritten = css;
  for (const match of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    const normalized = normalizeUrl(match[1], cssUrl);
    if (!normalized || !shouldDownloadAsset(normalized)) continue;
    const relAsset = await downloadAsset(normalized);
    const cssFile = path.join(OUT_ROOT, assetMap.get(cssUrl) ?? "");
    const localRef = cssFile ? relativeAssetPath(cssFile, relAsset) : relAsset;
    rewritten = rewritten.split(match[1]).join(localRef);
  }
  return rewritten;
}

async function postProcessCssAssets() {
  for (const [url, rel] of assetMap.entries()) {
    if (!rel.startsWith("assets/css/")) continue;
    const abs = path.join(OUT_ROOT, rel);
    const css = fs.readFileSync(abs, "utf8");
    const rewritten = await rewriteCssAssets(css, url);
    if (rewritten !== css) fs.writeFileSync(abs, rewritten);
  }
}

async function fetchCollectionData(handle) {
  const collectionUrl = `${BASE}/collections/${handle}.json`;
  const productsUrl = `${BASE}/collections/${handle}/products.json?limit=250`;

  const [collectionRes, productsRes] = await Promise.all([
    fetch(collectionUrl, { headers: { "User-Agent": USER_AGENT } }),
    fetch(productsUrl, { headers: { "User-Agent": USER_AGENT } }),
  ]);

  const collection = collectionRes.ok ? await collectionRes.json() : null;
  let products = [];
  if (productsRes.ok) {
    const body = await productsRes.json();
    products = body.products ?? [];
  }

  const imageUrls = [];
  if (collection?.collection?.image?.src) imageUrls.push(collection.collection.image.src);
  for (const product of products) {
    if (product.image?.src) imageUrls.push(product.image.src);
    for (const image of product.images ?? []) {
      if (image.src) imageUrls.push(image.src);
    }
  }

  for (const imageUrl of imageUrls) {
    if (shouldDownloadAsset(imageUrl)) await downloadAsset(imageUrl);
  }

  const localImages = {};
  for (const imageUrl of imageUrls) {
    if (assetMap.has(imageUrl)) localImages[imageUrl] = assetMap.get(imageUrl);
  }

  return {
    handle,
    fetchedAt: new Date().toISOString(),
    collection,
    products,
    localImages,
  };
}

async function fetchProductData(handle) {
  const productUrl = `${BASE}/products/${handle}.json`;
  const res = await fetch(productUrl, { headers: { "User-Agent": USER_AGENT } });
  const product = res.ok ? await res.json() : null;

  const imageUrls = [];
  const p = product?.product;
  if (p?.image?.src) imageUrls.push(p.image.src);
  for (const image of p?.images ?? []) {
    if (image.src) imageUrls.push(image.src);
  }

  for (const imageUrl of imageUrls) {
    if (shouldDownloadAsset(imageUrl)) await downloadAsset(imageUrl);
  }

  const localImages = {};
  for (const imageUrl of imageUrls) {
    if (assetMap.has(imageUrl)) localImages[imageUrl] = assetMap.get(imageUrl);
  }

  return {
    handle,
    fetchedAt: new Date().toISOString(),
    product,
    localImages,
  };
}

async function crawlPage(url) {
  const slug = pageSlugFromUrl(url);
  const outputFile = pageOutputPath(slug);
  ensureDir(path.dirname(outputFile));

  console.log(`page: ${url}`);
  const { text: html } = await fetchText(url);
  const rewritten = await rewriteHtmlAssets(html, url, outputFile);
  fs.writeFileSync(outputFile, rewritten, "utf8");
  return { url, slug, html };
}

async function main() {
  ensureDir(path.join(OUT_ROOT, "pages"));
  ensureDir(path.join(OUT_ROOT, "data"));
  ensureDir(path.join(OUT_ROOT, "assets"));

  const rootUrl = `${BASE}/collections`;
  const root = await crawlPage(rootUrl);
  const childUrls = extractLevel1CollectionLinks(root.html, rootUrl).sort();

  console.log(`found ${childUrls.length} level-1 collection pages`);

  const pages = [{ url: root.url, slug: root.slug, localHtml: path.relative(ROOT, pageOutputPath(root.slug)).replace(/\\/g, "/") }];
  const collectionHtmlPages = [{ url: root.url, html: root.html }];
  for (const childUrl of childUrls) {
    await sleep(300);
    const page = await crawlPage(childUrl);
    pages.push({
      url: page.url,
      slug: page.slug,
      localHtml: path.relative(ROOT, pageOutputPath(page.slug)).replace(/\\/g, "/"),
    });
    collectionHtmlPages.push({ url: page.url, html: page.html });
  }

  const productUrls = [
    ...new Set(collectionHtmlPages.flatMap(({ url, html }) => extractProductLinks(html, url))),
  ].sort();
  console.log(`found ${productUrls.length} product pages linked from collections`);

  for (const productUrl of productUrls) {
    await sleep(300);
    const page = await crawlPage(productUrl);
    pages.push({
      url: page.url,
      slug: page.slug,
      localHtml: path.relative(ROOT, pageOutputPath(page.slug)).replace(/\\/g, "/"),
    });
  }

  await postProcessCssAssets();

  const collectionsData = [];
  for (const childUrl of childUrls) {
    const handle = new URL(childUrl).pathname.split("/").pop();
    await sleep(300);
    console.log(`data: ${handle}`);
    const data = await fetchCollectionData(handle);
    const dataPath = path.join(OUT_ROOT, "data", `${handle}.json`);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
    collectionsData.push({
      handle,
      title: data.collection?.collection?.title ?? handle,
      url: childUrl,
      productsCount: data.products.length,
      localData: path.relative(ROOT, dataPath).replace(/\\/g, "/"),
    });
  }

  const productsData = [];
  for (const productUrl of productUrls) {
    const handle = new URL(productUrl).pathname.split("/").pop();
    await sleep(300);
    console.log(`data: products/${handle}`);
    const data = await fetchProductData(handle);
    const dataPath = path.join(OUT_ROOT, "data", "products", `${handle}.json`);
    ensureDir(path.dirname(dataPath));
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
    productsData.push({
      handle,
      title: data.product?.product?.title ?? handle,
      url: productUrl,
      localHtml: path.relative(ROOT, pageOutputPath(`products/${handle}`)).replace(/\\/g, "/"),
      localData: path.relative(ROOT, dataPath).replace(/\\/g, "/"),
    });
  }

  const manifest = {
    source: rootUrl,
    crawledAt: new Date().toISOString(),
    pages,
    collections: collectionsData,
    products: productsData,
    assetsDownloaded: assetMap.size,
    assets: Object.fromEntries(assetMap),
  };

  const manifestPath = path.join(OUT_ROOT, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\nDone.`);
  console.log(`  pages: ${pages.length}`);
  console.log(`  collections data: ${collectionsData.length}`);
  console.log(`  products data: ${productsData.length}`);
  console.log(`  assets: ${assetMap.size}`);
  console.log(`  output: ${path.relative(ROOT, OUT_ROOT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
