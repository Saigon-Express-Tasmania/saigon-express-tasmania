#!/usr/bin/env node
/**
 * Download primary image from an R&S product JSON and upload resized variants
 * to Supabase Storage (catering-packs/), mirroring admin CateringPacks.tsx.
 *
 * Usage:
 *   node scripts/upload-rssandwiches-catering-image.mjs refs/rssandwiches/gourmet-meat-sandwich-catering-platters.json
 *   node scripts/upload-rssandwiches-catering-image.mjs <json> --dry-run
 *   node scripts/upload-rssandwiches-catering-image.mjs <json> --update-db
 *
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "saigon-express-tasmania";
const FOLDER = "catering-packs";
const SIZES = [256, 512, 1024, 1920];

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dryRun = process.argv.includes("--dry-run");
const updateDb = process.argv.includes("--update-db");

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

function pickSourceUrl(data) {
  const urls = data.product?.image_urls ?? {};
  return (
    urls["1920"] ||
    data.source?.primary_image_url ||
    Object.values(urls).find((u) => typeof u === "string" && u.startsWith("http"))
  );
}

function objectPrefix(data) {
  const handle =
    data.source?.shopify_handle ||
    data.product?.slug ||
    data.product?.name?.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return String(handle).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

async function downloadToTemp(url) {
  const res = await fetch(url.startsWith("//") ? `https:${url}` : url);
  if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = path.join(root, "refs/rssandwiches/.tmp-primary.jpg");
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, buf);
  return tmp;
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

async function uploadBuffer(supabase, objectPath, buffer) {
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) throw new Error(`upload ${objectPath}: ${error.message}`);
}

async function main() {
  const jsonPath = args[0];
  if (!jsonPath) {
    console.error("Usage: node scripts/upload-rssandwiches-catering-image.mjs <product.json> [--dry-run] [--update-db]");
    process.exit(1);
  }

  const absJson = path.isAbsolute(jsonPath) ? jsonPath : path.join(root, jsonPath);
  const data = JSON.parse(fs.readFileSync(absJson, "utf8"));
  const originalUrls = { ...(data.product?.image_urls ?? {}) };
  const sourceUrl = pickSourceUrl(data);
  if (!sourceUrl) throw new Error("No source image URL in JSON");

  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  if (!dryRun && !serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  const prefix = objectPrefix(data);
  console.log(`Source: ${sourceUrl}`);
  console.log(`Prefix: ${prefix}`);

  const localPath = dryRun ? null : await downloadToTemp(sourceUrl);
  const image_urls = {};

  const supabase = serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  for (const size of SIZES) {
    const objectPath = `${FOLDER}/${prefix}_${size}.jpg`;
    if (dryRun) {
      image_urls[String(size)] = publicUrl(supabaseUrl, objectPath);
      continue;
    }
    const buffer = await resizeToBuffer(localPath, size);
    await uploadBuffer(supabase, objectPath, buffer);
    image_urls[String(size)] = publicUrl(supabaseUrl, objectPath);
    console.log(`  uploaded ${size} → ${objectPath}`);
  }

  if (localPath && fs.existsSync(localPath)) fs.unlinkSync(localPath);

  const image_url = image_urls["1920"] ?? image_urls["1024"];
  data.product.image_urls = image_urls;
  data.product.image_url = image_url;

  if (!data.source.image_urls_original) {
    data.source.image_urls_original = originalUrls;
  }

  fs.writeFileSync(absJson, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Updated ${path.relative(root, absJson)}`);

  if (updateDb && !dryRun && data.product.id) {
    const { error } = await supabase
      .from("products")
      .update({
        image_urls,
        image_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.product.id)
      .eq("product_type", "catering");

    if (error) throw new Error(`DB update: ${error.message}`);
    console.log(`Updated products.id=${data.product.id}`);
  }

  console.log(JSON.stringify({ image_url, image_urls }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
