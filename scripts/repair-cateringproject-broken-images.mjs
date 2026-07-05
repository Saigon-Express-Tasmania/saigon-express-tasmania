#!/usr/bin/env node
/**
 * Find broken Supabase image URLs in totalproducts.json, re-upload from local files,
 * then patch totalproducts.json and public.products rows (matched by catering slug).
 *
 * Usage:
 *   node scripts/repair-cateringproject-broken-images.mjs --dry-run
 *   node scripts/repair-cateringproject-broken-images.mjs --apply
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { inferProductSlug } from "./lib/cateringproject-product-slug.mjs";
import {
  BUCKET,
  FOLDER,
  buildPublicUrl,
  isSupabasePublicUrl,
  parseSupabaseObjectPath,
} from "./lib/cateringproject-supabase-images.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_HTML_ROOT = path.join(root, "refs/cateringproject/htmls");
const CHECK_BATCH_SIZE = 25;
const UPLOAD_BATCH_SIZE = 10;

const options = parseArgs(process.argv.slice(2));
const htmlRoot = path.resolve(root, options.htmlRoot);
const dryRun = !options.apply;

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});

function parseArgs(args) {
  const result = {
    htmlRoot: path.relative(root, DEFAULT_HTML_ROOT).replace(/\\/g, "/"),
    apply: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--html-root=")) {
      result.htmlRoot = arg.slice("--html-root=".length);
    } else if (arg === "--apply") {
      result.apply = true;
    } else if (arg === "--dry-run") {
      result.apply = false;
    }
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

  const supabase = serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  const totalProductsPath = path.join(htmlRoot, "totalproducts.json");
  const products = readJson(totalProductsPath);
  if (!Array.isArray(products)) {
    throw new Error(`${totalProductsPath} must be a JSON array`);
  }

  const urlEntries = collectRemoteUrlEntries(products);
  const uniqueUrls = [...new Set(urlEntries.map((entry) => entry.url))];

  console.log(
    `${dryRun ? "Checking" : "Repairing"} ${products.length} products (${uniqueUrls.length} unique image URLs)...`,
  );

  const brokenUrls = await findBrokenUrls(uniqueUrls);
  console.log(`Broken URLs: ${brokenUrls.size}/${uniqueUrls.length}`);

  if (brokenUrls.size === 0) {
    console.log("Nothing to repair.");
    return;
  }

  const uploadJobs = buildUploadJobs({
    products,
    urlEntries,
    brokenUrls,
    htmlRoot,
  });

  console.log(
    `Upload jobs: ${uploadJobs.length} (${new Set(uploadJobs.map((job) => job.objectPath)).size} unique objects, ${new Set(uploadJobs.map((job) => job.productSlug)).size} products)`,
  );

  const missingLocal = uploadJobs.filter((job) => !job.absolutePath);
  if (missingLocal.length) {
    console.warn(`Missing local files: ${missingLocal.length}`);
    for (const job of missingLocal.slice(0, 10)) {
      console.warn(`  ${job.productSlug}: ${job.fileName}`);
    }
  }

  const summary = {
    generated_at: new Date().toISOString(),
    dry_run: dryRun,
    products_total: products.length,
    unique_urls: uniqueUrls.length,
    broken_urls: brokenUrls.size,
    upload_jobs: uploadJobs.length,
    missing_local_files: missingLocal.length,
    uploads_completed: 0,
    uploads_failed: 0,
    products_patched_json: 0,
    products_patched_db: 0,
    db_patch_failures: 0,
  };

  if (dryRun) {
    summary.sample_broken_urls = [...brokenUrls].slice(0, 20);
    summary.sample_upload_jobs = uploadJobs.slice(0, 20).map((job) => ({
      product_slug: job.productSlug,
      object_path: job.objectPath,
      local_file: job.absolutePath,
      missing_local_file: !job.absolutePath,
    }));
    writeSummary(summary);
    console.log("Dry run complete. Pass --apply to upload and patch.");
    return;
  }

  const uploadResults = await runUploadsInBatches({
    jobs: uploadJobs.filter((job) => job.absolutePath),
    batchSize: UPLOAD_BATCH_SIZE,
    supabase,
    supabaseUrl,
  });
  summary.uploads_completed = uploadResults.uploaded;
  summary.uploads_failed = uploadResults.failed;

  const patchedSlugs = new Set(uploadJobs.map((job) => job.productSlug));

  for (const product of products) {
    const slug = getProductSlug(product);
    if (!slug || !patchedSlugs.has(slug)) continue;

    const nextImageUrls = rebuildImageUrls(product, supabaseUrl);
    product.image_urls = nextImageUrls;
    product.image_url =
      nextImageUrls["1920"] ??
      nextImageUrls["1024"] ??
      nextImageUrls["512"] ??
      nextImageUrls["256"] ??
      product.image_url ??
      null;
    summary.products_patched_json += 1;
  }

  fs.writeFileSync(totalProductsPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");

  for (const product of products) {
    const slug = getProductSlug(product);
    if (!slug || !patchedSlugs.has(slug)) continue;

    const { error } = await supabase
      .from("products")
      .update({
        image_urls: product.image_urls ?? {},
        image_url: product.image_url ?? null,
      })
      .eq("product_type", "catering")
      .eq("slug", slug);

    if (error) {
      summary.db_patch_failures += 1;
      console.warn(`  DB patch failed (${slug}): ${error.message}`);
      continue;
    }

    summary.products_patched_db += 1;
  }

  const remainingBroken = await findBrokenUrls(
    collectRemoteUrlEntries(products).map((entry) => entry.url),
  );
  summary.remaining_broken_urls = remainingBroken.size;

  writeSummary(summary);
  console.log(
    `Done. Uploaded ${summary.uploads_completed}, failed ${summary.uploads_failed}, patched JSON ${summary.products_patched_json}, DB ${summary.products_patched_db}, remaining broken URLs ${summary.remaining_broken_urls}.`,
  );
}

function writeSummary(summary) {
  const summaryPath = path.join(
    htmlRoot,
    dryRun
      ? "_totalproducts-broken-images-dry-run.json"
      : "_totalproducts-broken-images-repair.json",
  );
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Summary written to ${summaryPath}`);
}

function getProductSlug(product) {
  return product.product_slug ?? inferProductSlug(product);
}

function collectRemoteUrlEntries(products) {
  const entries = [];

  for (const product of products) {
    const slug = getProductSlug(product);
    const imageUrls = product.image_urls ?? {};

    for (const key of ["256", "512", "1024", "1920"]) {
      const url = imageUrls[key];
      if (isSupabasePublicUrl(url)) {
        entries.push({ product, slug, field: `image_urls.${key}`, url });
      }
    }

    if (isSupabasePublicUrl(product.image_url)) {
      entries.push({
        product,
        slug,
        field: "image_url",
        url: product.image_url,
      });
    }

    if (Array.isArray(imageUrls.more)) {
      for (const [index, entry] of imageUrls.more.entries()) {
        for (const field of ["sm", "lg"]) {
          const url = entry[field];
          if (isSupabasePublicUrl(url)) {
            entries.push({
              product,
              slug,
              field: `image_urls.more[${index}].${field}`,
              url,
            });
          }
        }
      }
    }
  }

  return entries;
}

async function findBrokenUrls(urls) {
  const uniqueUrls = [...new Set(urls)];
  const broken = new Set();

  for (let index = 0; index < uniqueUrls.length; index += CHECK_BATCH_SIZE) {
    const batch = uniqueUrls.slice(index, index + CHECK_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (url) => ({
        url,
        broken: await isUrlBroken(url),
      })),
    );

    for (const result of results) {
      if (result.broken) broken.add(result.url);
    }

    if ((index / CHECK_BATCH_SIZE) % 20 === 0) {
      process.stderr.write(
        `checked ${Math.min(index + CHECK_BATCH_SIZE, uniqueUrls.length)}/${uniqueUrls.length}\n`,
      );
    }
  }

  return broken;
}

async function isUrlBroken(url) {
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow" });
    return !response.ok;
  } catch {
    return true;
  }
}

function buildUploadJobs({ products, urlEntries, brokenUrls, htmlRoot }) {
  const jobsByObjectPath = new Map();

  for (const entry of urlEntries) {
    if (!brokenUrls.has(entry.url)) continue;

    const parsed = parseSupabaseObjectPath(entry.url);
    if (!parsed) continue;

    if (jobsByObjectPath.has(parsed.objectPath)) continue;

    jobsByObjectPath.set(parsed.objectPath, {
      product: entry.product,
      productSlug: parsed.productSlug,
      fileName: parsed.fileName,
      objectPath: parsed.objectPath,
      absolutePath: resolveLocalAbsolutePath({
        product: entry.product,
        htmlRoot,
        productSlug: parsed.productSlug,
        fileName: parsed.fileName,
      }),
    });
  }

  return [...jobsByObjectPath.values()];
}

function resolveLocalAbsolutePath({ product, htmlRoot, productSlug, fileName }) {
  const categorySlugs = [
    product._source?.image_category_slug,
    ...(product._source?.category_slugs ?? []),
  ].filter(Boolean);

  const seen = new Set();
  for (const categorySlug of categorySlugs) {
    const key = categorySlug.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const absolutePath = path.join(
      htmlRoot,
      categorySlug,
      "images",
      productSlug,
      fileName,
    );
    if (fs.existsSync(absolutePath)) return absolutePath;
  }

  return null;
}

function rebuildImageUrls(product, supabaseUrl) {
  const slug = getProductSlug(product);
  const imageUrls = { ...(product.image_urls ?? {}) };
  const dir = resolveProductImageDir(product, slug);

  for (const key of ["256", "512", "1024", "1920"]) {
    const current = imageUrls[key];
    const parsed = isSupabasePublicUrl(current)
      ? parseSupabaseObjectPath(current)
      : null;
    if (!parsed) continue;
    imageUrls[key] = buildPublicUrl(supabaseUrl, parsed.objectPath);
  }

  if (Array.isArray(imageUrls.more)) {
    imageUrls.more = imageUrls.more.map((entry) => {
      const next = { ...entry };
      for (const field of ["sm", "lg"]) {
        const parsed = isSupabasePublicUrl(entry[field])
          ? parseSupabaseObjectPath(entry[field])
          : null;
        if (parsed) {
          next[field] = buildPublicUrl(supabaseUrl, parsed.objectPath);
        }
      }
      return next;
    });
  }

  if (dir && fs.existsSync(dir)) {
    for (const fileName of fs.readdirSync(dir)) {
      const objectPath = `${FOLDER}/${slug}/${fileName}`;
      const publicUrl = buildPublicUrl(supabaseUrl, objectPath);
      const variant = fileName.match(/_(\d+)\.[^.]+$/);
      if (variant) {
        imageUrls[variant[1]] = publicUrl;
      }
    }
  }

  return imageUrls;
}

function resolveProductImageDir(product, slug) {
  const categorySlug = product._source?.image_category_slug;
  if (!categorySlug) return null;
  return path.join(htmlRoot, categorySlug, "images", slug);
}

async function runUploadsInBatches({ jobs, batchSize, supabase, supabaseUrl }) {
  let uploaded = 0;
  let failed = 0;

  for (let index = 0; index < jobs.length; index += batchSize) {
    const batch = jobs.slice(index, index + batchSize);
    const results = await Promise.allSettled(
      batch.map((job) =>
        uploadLocalFile({
          supabase,
          supabaseUrl,
          absolutePath: job.absolutePath,
          objectPath: job.objectPath,
        }),
      ),
    );

    for (const [resultIndex, result] of results.entries()) {
      const job = batch[resultIndex];
      if (result.status === "fulfilled") {
        uploaded += 1;
      } else {
        failed += 1;
        console.warn(
          `  upload failed (${job.objectPath}): ${String(result.reason?.message || result.reason)}`,
        );
      }
    }

    process.stderr.write(
      `uploaded ${Math.min(index + batchSize, jobs.length)}/${jobs.length}\n`,
    );
  }

  return { uploaded, failed };
}

async function uploadLocalFile({ supabase, supabaseUrl, absolutePath, objectPath }) {
  const buffer = fs.readFileSync(absolutePath);
  const contentType = mimeTypeForPath(absolutePath);

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    upsert: true,
    contentType,
    cacheControl: "31536000",
  });

  if (error) {
    throw new Error(`${objectPath}: ${error.message}`);
  }

  return buildPublicUrl(supabaseUrl, objectPath);
}

function mimeTypeForPath(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}
