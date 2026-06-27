import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const USER_AGENT = "saigon-express-tasmania-seed/1.0";

export function shopifyImageKey(url) {
  try {
    const normalized = url.startsWith("//") ? `https:${url}` : url;
    const parsed = new URL(normalized);
    const base = path.basename(parsed.pathname);
    return base
      .replace(/_\d+x(?=\.[a-z0-9]+$)/i, "")
      .replace(/\.[a-z0-9]+$/i, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

export function loadManifestAssets(manifestPath) {
  if (!fs.existsSync(manifestPath)) return {};
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return manifest.assets ?? {};
}

export function extractGallerySourcesFromHtml(htmlPath) {
  if (!fs.existsSync(htmlPath)) return [];

  const html = fs.readFileSync(htmlPath, "utf8");
  const galleryMatch = html.match(
    /class="gallery-wrap js-product-page-gallery[\s\S]*?<div class="product_gallery_nav/,
  );
  if (!galleryMatch) return [];

  const urls = [];
  for (const match of galleryMatch[0].matchAll(/data-src="([^"]+)"/g)) {
    const url = normalizeUrl(match[1].trim());
    if (url) urls.push(url);
  }

  const seen = new Set();
  return urls.filter((url) => {
    const key = shopifyImageKey(url);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findManifestLocalPath(url, manifestAssets) {
  const targetKey = shopifyImageKey(url);
  if (!targetKey) return null;

  for (const [assetUrl, relPath] of Object.entries(manifestAssets)) {
    if (shopifyImageKey(assetUrl) === targetKey) return relPath;
  }
  return null;
}

export function resolveLocalImagePath({
  url,
  localImages,
  manifestAssets,
  chaocateringRoot,
  cacheDir,
  cacheKey,
}) {
  const normalized = normalizeUrl(url);
  const direct = localImages?.[normalized] ?? localImages?.[url];
  if (direct) {
    const abs = path.join(chaocateringRoot, direct);
    if (fs.existsSync(abs)) return abs;
  }

  const manifestRel = findManifestLocalPath(normalized, manifestAssets);
  if (manifestRel) {
    const abs = path.join(chaocateringRoot, manifestRel);
    if (fs.existsSync(abs)) return abs;
  }

  return path.join(cacheDir, `${cacheKey}.jpg`);
}

export async function ensureLocalImageFile(localPath, sourceUrl) {
  if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
    return localPath;
  }

  fs.mkdirSync(path.dirname(localPath), { recursive: true });

  const res = await fetch(normalizeUrl(sourceUrl), {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`GET ${sourceUrl} -> ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) {
    throw new Error(`Empty image response for ${sourceUrl}`);
  }

  fs.writeFileSync(localPath, buffer);
  return localPath;
}

export function collectProductImageSources(productData, handle, chaocateringRoot, manifestAssets) {
  const product = productData.product?.product;
  if (!product) return [];

  const localImages = productData.localImages ?? {};
  const htmlPath = path.join(chaocateringRoot, "pages/products", `${handle}.html`);
  const galleryHtmlUrls = extractGallerySourcesFromHtml(htmlPath);

  const jsonImages = [...(product.images ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );

  const entries = [];
  const seen = new Set();

  const addEntry = (sourceUrl, position) => {
    const key = shopifyImageKey(sourceUrl);
    if (!key || seen.has(key)) return;
    seen.add(key);
    entries.push({
      sourceUrl: normalizeUrl(sourceUrl),
      position: position ?? entries.length,
      cacheKey: `${handle}-${entries.length}-${crypto.createHash("sha1").update(key).digest("hex").slice(0, 8)}`,
    });
  };

  for (const image of jsonImages) {
    if (image?.src) addEntry(image.src, image.position);
  }

  for (const sourceUrl of galleryHtmlUrls) {
    addEntry(sourceUrl);
  }

  const cacheDir = path.join(chaocateringRoot, "assets/images/cache");

  return entries.map((entry) => ({
    ...entry,
    localPath: resolveLocalImagePath({
      url: entry.sourceUrl,
      localImages,
      manifestAssets,
      chaocateringRoot,
      cacheDir,
      cacheKey: entry.cacheKey,
    }),
  }));
}
