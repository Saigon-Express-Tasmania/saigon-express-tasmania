#!/usr/bin/env node
/**
 * Resize and upload Chao Catering product images to Supabase Storage.
 * Mirrors admin CateringPacks.tsx: sizes 256/512/1024/1920 in catering-packs/,
 * additional gallery images as more[] with sm (256) and lg (1920).
 *
 * Collects every gallery image per product from Shopify JSON + HTML gallery,
 * downloads missing files when needed, then uploads all images.
 *
 * Usage:
 *   node scripts/upload-chaocatering-images.mjs
 *   node scripts/upload-chaocatering-images.mjs --dry-run
 *
 * Env (from .env / .env.local):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  collectProductImageSources,
  ensureLocalImageFile,
  loadManifestAssets,
} from "./lib/chaocatering-images.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chaocateringRoot = path.join(root, "refs/chaocatering");
const productsDir = path.join(chaocateringRoot, "data/products");
const manifestPath = path.join(chaocateringRoot, "manifest.json");
const outPath = path.join(chaocateringRoot, "image-urls.json");

const BUCKET = "saigon-express-tasmania";
const FOLDER = "catering-packs";
const PRIMARY_SIZES = [256, 512, 1024, 1920];
const dryRun = process.argv.includes("--dry-run");

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

function publicUrl(supabaseUrl, objectPath) {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

async function resizeToBuffer(inputPath, maxSize) {
  return sharp(inputPath)
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

async function uploadBuffer(supabase, objectPath, buffer, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    upsert: true,
    contentType,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`upload ${objectPath}: ${error.message}`);
}

function loadProducts() {
  return fs
    .readdirSync(productsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(productsDir, f), "utf8")))
    .filter((data) => data.product?.product)
    .sort((a, b) => a.product.product.handle.localeCompare(b.product.product.handle));
}

async function uploadSizedSet({
  supabase,
  supabaseUrl,
  localPath,
  objectPrefix,
  sizes,
}) {
  const urls = {};

  for (const size of sizes) {
    const objectPath = `${FOLDER}/${objectPrefix}_${size}.jpg`;
    if (dryRun) {
      urls[String(size)] = publicUrl(supabaseUrl, objectPath);
      continue;
    }
    const buffer = await resizeToBuffer(localPath, size);
    await uploadBuffer(supabase, objectPath, buffer, "image/jpeg");
    urls[String(size)] = publicUrl(supabaseUrl, objectPath);
  }

  return urls;
}

async function uploadGalleryPair({ supabase, supabaseUrl, localPath, objectPrefix }) {
  const smPath = `${FOLDER}/${objectPrefix}-sm.jpg`;
  const lgPath = `${FOLDER}/${objectPrefix}-lg.jpg`;

  if (dryRun) {
    return {
      sm: publicUrl(supabaseUrl, smPath),
      lg: publicUrl(supabaseUrl, lgPath),
    };
  }

  const [smBuffer, lgBuffer] = await Promise.all([
    resizeToBuffer(localPath, 256),
    resizeToBuffer(localPath, 1920),
  ]);
  await uploadBuffer(supabase, smPath, smBuffer, "image/jpeg");
  await uploadBuffer(supabase, lgPath, lgBuffer, "image/jpeg");

  return {
    sm: publicUrl(supabaseUrl, smPath),
    lg: publicUrl(supabaseUrl, lgPath),
  };
}

async function uploadProductImages(supabase, supabaseUrl, productData, manifestAssets) {
  const handle = productData.product.product.handle;
  const imageSources = collectProductImageSources(
    productData,
    handle,
    chaocateringRoot,
    manifestAssets,
  );

  const result = {
    handle,
    image_count: imageSources.length,
    image_url: null,
    image_urls: {},
    gallery: [],
  };

  if (!imageSources.length) {
    console.warn(`  skip ${handle}: no gallery images found`);
    return result;
  }

  const baseName = handle.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const resolvedPaths = [];

  for (const source of imageSources) {
    try {
      const localPath = await ensureLocalImageFile(source.localPath, source.sourceUrl);
      resolvedPaths.push({ ...source, localPath });
    } catch (err) {
      console.warn(
        `  warn ${handle}: could not resolve image ${source.sourceUrl} (${err.message})`,
      );
    }
  }

  if (!resolvedPaths.length) {
    console.warn(`  skip ${handle}: no resolvable local image files`);
    return result;
  }

  const [primary, ...gallery] = resolvedPaths;

  result.image_urls = await uploadSizedSet({
    supabase,
    supabaseUrl,
    localPath: primary.localPath,
    objectPrefix: baseName,
    sizes: PRIMARY_SIZES,
  });

  result.image_url = result.image_urls["1920"] ?? result.image_urls["1024"] ?? null;

  const more = [];
  for (let i = 0; i < gallery.length; i += 1) {
    const entry = await uploadGalleryPair({
      supabase,
      supabaseUrl,
      localPath: gallery[i].localPath,
      objectPrefix: `${baseName}-more-${i + 1}`,
    });
    more.push(entry);
    result.gallery.push({
      index: i + 1,
      sourceUrl: gallery[i].sourceUrl,
      ...entry,
    });
  }

  if (more.length > 0) {
    result.image_urls.more = more;
  }

  return result;
}

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

  const manifestAssets = loadManifestAssets(manifestPath);
  const products = loadProducts();
  console.log(`${dryRun ? "Dry run" : "Uploading"} ${products.length} catering products…`);

  const supabase = serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  const byHandle = {};
  let totalImages = 0;
  let multiImageProducts = 0;

  for (const productData of products) {
    const handle = productData.product.product.handle;
    const uploaded = await uploadProductImages(
      supabase,
      supabaseUrl,
      productData,
      manifestAssets,
    );
    byHandle[handle] = uploaded;
    totalImages += uploaded.image_count;
    if (uploaded.image_count > 1) multiImageProducts += 1;
    console.log(
      `→ ${handle} (${uploaded.image_count} image${uploaded.image_count === 1 ? "" : "s"}: 1 primary + ${Math.max(0, uploaded.image_count - 1)} gallery)`,
    );
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    bucket: BUCKET,
    folder: FOLDER,
    dryRun,
    stats: {
      products: products.length,
      totalImages,
      multiImageProducts,
    },
    products: byHandle,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${path.relative(root, outPath)}`);
  console.log(
    `Images: ${totalImages} total across ${products.length} products (${multiImageProducts} with gallery)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
