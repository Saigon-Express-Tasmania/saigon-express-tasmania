#!/usr/bin/env node
/**
 * Supabase storage maintenance:
 *   1. Find unused blog-posts files (default mode)
 *   2. Optimize images in selected storage folders (--optimize-images)
 *
 * Usage:
 *   node scripts/cleanup-unused-blog-post-storage.mjs              # dry run cleanup (default)
 *   node scripts/cleanup-unused-blog-post-storage.mjs --apply      # delete unused blog-posts files
 *   node scripts/cleanup-unused-blog-post-storage.mjs --optimize-images
 *   node scripts/cleanup-unused-blog-post-storage.mjs --optimize-images --apply
 *   node scripts/cleanup-unused-blog-post-storage.mjs --optimize-images --verbose
 *   node scripts/cleanup-unused-blog-post-storage.mjs --optimize-images --reprocess
 *
 * Optimize-images dry run downloads and optimizes into refs/supabase-storage-opt/
 * (manifest + cached files). --apply uploads from that cache without re-processing.
 *
 * Env:
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET (optional, default: saigon-express-tasmania)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  optimizeFile,
  RASTER_EXTENSIONS,
  SVG_EXTENSIONS,
} from "./lib/image-optimize.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(root, "refs", "supabase-storage-opt");
const CACHE_FILES_DIR = path.join(CACHE_DIR, "files");
const MANIFEST_PATH = path.join(CACHE_DIR, "manifest.json");
const MANIFEST_VERSION = 1;
const MANIFEST_SAVE_EVERY = 50;
const DEFAULT_BUCKET = "saigon-express-tasmania";
const DEFAULT_FOLDER = "blog-posts";
const DEFAULT_OPTIMIZE_FOLDERS = [
  "catering-packs",
  "menu",
  "wholesale-products",
  "images",
];
const LIST_PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;
const UPLOAD_CACHE_CONTROL = "31536000";
const OPTIMIZE_PROGRESS_EVERY = 50;
const LIST_FOLDER_PROGRESS_EVERY = 25;
const LIST_IMAGE_PROGRESS_EVERY = 100;

const options = parseArgs(process.argv.slice(2));
const dryRun = !options.apply;

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});

function parseArgs(args) {
  const result = {
    apply: false,
    optimizeImages: false,
    reprocess: false,
    verbose: false,
    folder: DEFAULT_FOLDER,
    optimizeFolders: [...DEFAULT_OPTIMIZE_FOLDERS],
    bucket: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET,
  };

  for (const arg of args) {
    if (arg === "--apply") {
      result.apply = true;
    } else if (arg === "--dry-run") {
      result.apply = false;
    } else if (arg === "--optimize-images") {
      result.optimizeImages = true;
    } else if (arg === "--verbose") {
      result.verbose = true;
    } else if (arg === "--reprocess") {
      result.reprocess = true;
    } else if (arg.startsWith("--folder=")) {
      result.folder = normalizeStoragePath(arg.slice("--folder=".length));
    } else if (arg.startsWith("--optimize-folders=")) {
      result.optimizeFolders = arg
        .slice("--optimize-folders=".length)
        .split(",")
        .map((value) => normalizeStoragePath(value))
        .filter(Boolean);
    } else if (arg.startsWith("--bucket=")) {
      result.bucket = arg.slice("--bucket=".length).trim();
    }
  }

  return result;
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

function normalizeStoragePath(value) {
  return String(value ?? "").trim().replace(/^\/+/, "");
}

function storagePathFromPublicUrl(publicUrl, bucket) {
  const trimmed = publicUrl.trim();
  if (!trimmed || !bucket) return null;

  const encodedBucket = encodeURIComponent(bucket);
  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/public/${encodedBucket}/`,
    `/object/public/${bucket}/`,
    `/object/public/${encodedBucket}/`,
  ];

  for (const marker of markers) {
    const index = trimmed.indexOf(marker);
    if (index === -1) continue;
    try {
      return normalizeStoragePath(
        decodeURIComponent(trimmed.slice(index + marker.length)),
      );
    } catch {
      return normalizeStoragePath(trimmed.slice(index + marker.length));
    }
  }

  return null;
}

function resolveStorageObjectPath({ path: objectPath, publicUrl, bucket }) {
  const normalizedPath = normalizeStoragePath(objectPath);
  if (normalizedPath) return normalizedPath;
  if (!publicUrl) return null;
  return storagePathFromPublicUrl(publicUrl, bucket);
}

function normalizeBlogPostReference(value, bucket) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const rawUploaded = value.uploaded;
  if (!Array.isArray(rawUploaded)) return [];

  const assets = [];
  for (const item of rawUploaded) {
    if (!item || typeof item !== "object") continue;

    const publicUrl = String(item.publicUrl ?? "").trim();
    const resolvedPath =
      resolveStorageObjectPath({
        path: String(item.path ?? "").trim(),
        publicUrl,
        bucket,
      }) ?? "";

    if (!resolvedPath && !publicUrl) continue;

    assets.push({
      path: resolvedPath,
      publicUrl,
      fileName:
        String(item.fileName ?? "").trim() ||
        resolvedPath.split("/").pop() ||
        "file",
    });
  }

  return assets;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatSavings(beforeBytes, afterBytes) {
  const saved = beforeBytes - afterBytes;
  const percent =
    beforeBytes > 0 ? ((saved / beforeBytes) * 100).toFixed(1) : "0.0";
  return `${formatBytes(beforeBytes)} → ${formatBytes(afterBytes)} (save ${formatBytes(saved)}, ${percent}%)`;
}

function isImageStoragePath(objectPath) {
  const ext = path.extname(objectPath).toLowerCase();
  return RASTER_EXTENSIONS.has(ext) || SVG_EXTENSIONS.has(ext);
}

function mimeTypeForPath(objectPath) {
  switch (path.extname(objectPath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function listStorageFiles(supabase, bucket, folderPrefix) {
  const files = [];

  async function walk(folder) {
    let offset = 0;

    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(folder, {
        limit: LIST_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        throw new Error(`Failed to list "${folder || "(root)"}": ${error.message}`);
      }

      if (!data || data.length === 0) break;

      for (const item of data) {
        const itemPath = folder ? `${folder}/${item.name}` : item.name;

        if (item.id === null) {
          await walk(itemPath);
          continue;
        }

        const size =
          typeof item.metadata?.size === "number"
            ? item.metadata.size
            : typeof item.metadata?.contentLength === "number"
              ? item.metadata.contentLength
              : null;

        files.push({ path: normalizeStoragePath(itemPath), size });
      }

      if (data.length < LIST_PAGE_SIZE) break;
      offset += LIST_PAGE_SIZE;
    }
  }

  await walk(folderPrefix);
  return files;
}

async function fetchBlogPostReferences(supabase) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, reference");

  if (error) {
    throw new Error(`Failed to fetch blog_posts.reference: ${error.message}`);
  }

  return data ?? [];
}

function collectReferencedPaths(posts, bucket) {
  const referencedPaths = new Set();
  const referencesByPath = new Map();

  for (const post of posts) {
    const assets = normalizeBlogPostReference(post.reference, bucket);

    for (const asset of assets) {
      if (!asset.path) continue;
      referencedPaths.add(asset.path);
      const existing = referencesByPath.get(asset.path) ?? [];
      existing.push({ postId: post.id, slug: post.slug, fileName: asset.fileName });
      referencesByPath.set(asset.path, existing);
    }
  }

  return { referencedPaths, referencesByPath };
}

async function deleteStorageFiles(supabase, bucket, paths) {
  let deleted = 0;

  for (let index = 0; index < paths.length; index += DELETE_BATCH_SIZE) {
    const batch = paths.slice(index, index + DELETE_BATCH_SIZE);
    const { data, error } = await supabase.storage.from(bucket).remove(batch);

    if (error) {
      throw new Error(
        `Failed to delete batch starting at index ${index}: ${error.message}`,
      );
    }

    deleted += (data ?? []).length;
  }

  return deleted;
}

async function* iterateStorageImageFiles(supabase, bucket, folders) {
  const seen = new Set();
  const stats = { foldersListed: 0, imagesFound: 0 };

  async function* walk(folder) {
    stats.foldersListed += 1;

    if (
      stats.foldersListed === 1 ||
      stats.foldersListed % LIST_FOLDER_PROGRESS_EVERY === 0
    ) {
      console.log(
        `  listing… ${stats.foldersListed} folders scanned, ${stats.imagesFound} images found (at ${folder})`,
      );
    }

    let offset = 0;

    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(folder, {
        limit: LIST_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        throw new Error(`Failed to list "${folder || "(root)"}": ${error.message}`);
      }

      if (!data || data.length === 0) break;

      for (const item of data) {
        const itemPath = folder ? `${folder}/${item.name}` : item.name;

        if (item.id === null) {
          yield* walk(itemPath);
          continue;
        }

        const normalizedPath = normalizeStoragePath(itemPath);
        if (!isImageStoragePath(normalizedPath) || seen.has(normalizedPath)) {
          continue;
        }

        seen.add(normalizedPath);
        stats.imagesFound += 1;

        if (stats.imagesFound % LIST_IMAGE_PROGRESS_EVERY === 0) {
          console.log(`  found ${stats.imagesFound} images…`);
        }

        const size =
          typeof item.metadata?.size === "number"
            ? item.metadata.size
            : typeof item.metadata?.contentLength === "number"
              ? item.metadata.contentLength
              : null;

        yield { path: normalizedPath, size };
      }

      if (data.length < LIST_PAGE_SIZE) break;
      offset += LIST_PAGE_SIZE;
    }
  }

  for (const folder of folders) {
    console.log(`Listing ${folder}/…`);
    yield* walk(folder);
  }

  console.log(
    `Listing complete: ${stats.imagesFound} images across ${stats.foldersListed} folders.`,
  );
}

async function uploadOptimizedImage(supabase, bucket, objectPath, buffer) {
  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    upsert: true,
    contentType: mimeTypeForPath(objectPath),
    cacheControl: UPLOAD_CACHE_CONTROL,
  });

  if (error) {
    throw new Error(`${objectPath}: ${error.message}`);
  }
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function cachedFilePath(storagePath) {
  return path.join(CACHE_FILES_DIR, storagePath);
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch (error) {
    throw new Error(
      `Failed to read manifest at ${MANIFEST_PATH}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function saveManifest(manifest) {
  ensureParentDir(MANIFEST_PATH);
  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

function createManifest({ bucket, folders }) {
  return {
    version: MANIFEST_VERSION,
    bucket,
    folders,
    updatedAt: new Date().toISOString(),
    entries: {},
  };
}

function getCachedEntry(manifest, storagePath) {
  return manifest.entries[storagePath] ?? null;
}

function setCachedEntry(manifest, storagePath, entry) {
  manifest.entries[storagePath] = entry;
}

function countManifestEntries(manifest, status) {
  return Object.values(manifest.entries).filter((entry) => entry.status === status).length;
}

async function runApplyFromCache({ supabase, bucket, manifest, verbose }) {
  const optimizedEntries = Object.entries(manifest.entries)
    .filter(([, entry]) => entry.status === "optimized")
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath));

  console.log(`Cache folder: ${CACHE_DIR}`);
  console.log(`Manifest entries: ${Object.keys(manifest.entries).length}`);
  console.log(`Uploading ${optimizedEntries.length} optimized file(s) from cache…`);
  console.log("");

  const summary = {
    uploaded: [],
    missing: [],
    errors: [],
    beforeBytes: 0,
    afterBytes: 0,
  };

  for (let index = 0; index < optimizedEntries.length; index += 1) {
    const [storagePath, entry] = optimizedEntries[index];
    const label = `[${index + 1}/${optimizedEntries.length}]`;
    const cachePath = cachedFilePath(storagePath);

    if (!fs.existsSync(cachePath)) {
      summary.missing.push(storagePath);
      console.error(`${label} missing cache file ${storagePath}`);
      continue;
    }

    try {
      if (verbose) {
        console.log(`${label} upload ${storagePath}`);
      }

      const buffer = fs.readFileSync(cachePath);
      await uploadOptimizedImage(supabase, bucket, storagePath, buffer);

      summary.uploaded.push(storagePath);
      summary.beforeBytes += entry.beforeBytes ?? 0;
      summary.afterBytes += entry.afterBytes ?? buffer.length;

      if (!verbose && (index + 1) % OPTIMIZE_PROGRESS_EVERY === 0) {
        console.log(`Uploaded ${index + 1}/${optimizedEntries.length}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.errors.push({ path: storagePath, message });
      console.error(`${label} error ${storagePath}: ${message}`);
    }
  }

  const savedBytes = summary.beforeBytes - summary.afterBytes;
  const savedPercent =
    summary.beforeBytes > 0
      ? ((savedBytes / summary.beforeBytes) * 100).toFixed(1)
      : "0.0";

  console.log("");
  console.log(`Uploaded: ${summary.uploaded.length}`);
  console.log(`Missing cache files: ${summary.missing.length}`);
  console.log(`Errors: ${summary.errors.length}`);
  console.log(
    `Total size: ${formatBytes(summary.beforeBytes)} → ${formatBytes(summary.afterBytes)}`,
  );
  console.log(`Saved: ${formatBytes(savedBytes)} (${savedPercent}%)`);

  if (summary.missing.length > 0) {
    console.log("");
    console.log(
      "Re-run without --apply to rebuild missing cache files, then --apply again.",
    );
  }
}

async function runOptimizeImages({
  supabase,
  bucket,
  folders,
  dryRun,
  verbose,
  reprocess,
}) {
  if (!dryRun) {
    const manifest = loadManifest();
    const optimizedCount = manifest ? countManifestEntries(manifest, "optimized") : 0;

    if (manifest && optimizedCount > 0) {
      if (manifest.bucket && manifest.bucket !== bucket) {
        console.warn(
          `Manifest bucket (${manifest.bucket}) differs from current bucket (${bucket}).`,
        );
      }

      await runApplyFromCache({ supabase, bucket, manifest, verbose });
      return;
    }

    console.log("No cached manifest with optimized files found; running full processing…");
    console.log("");
  }

  console.log(`${dryRun ? "Dry run" : "Apply"}: storage image optimization`);
  console.log(`Bucket: ${bucket}`);
  console.log(`Folders: ${folders.join(", ")}/`);
  console.log(`Cache folder: ${CACHE_DIR}`);
  console.log("");
  console.log(
    "Scanning storage folders first (catering-packs alone can take several minutes)…",
  );
  console.log("");

  fs.mkdirSync(CACHE_FILES_DIR, { recursive: true });

  const existingManifest = loadManifest();
  const manifest =
    existingManifest && !reprocess
      ? existingManifest
      : createManifest({ bucket, folders });

  if (reprocess) {
    manifest.bucket = bucket;
    manifest.folders = folders;
    manifest.entries = {};
  } else if (!manifest.bucket) {
    manifest.bucket = bucket;
    manifest.folders = folders;
  }

  const summary = {
    optimized: [],
    skipped: [],
    fromCache: [],
    errors: [],
    beforeBytes: 0,
    afterBytes: 0,
  };

  let index = 0;
  let manifestDirty = false;

  const flushManifest = () => {
    if (!manifestDirty) return;
    saveManifest(manifest);
    manifestDirty = false;
  };

  for await (const file of iterateStorageImageFiles(supabase, bucket, folders)) {
    index += 1;

    if (index === 1) {
      console.log("");
      console.log("Downloading, optimizing, and saving to cache as images are discovered…");
      console.log("");
    }

    const label = `[${index}]`;
    const cachePath = cachedFilePath(file.path);
    const cachedEntry = getCachedEntry(manifest, file.path);
    const fileExt = path.extname(file.path);
    const workPath = path.join(
      path.dirname(cachePath),
      `${path.basename(cachePath, fileExt)}.work${fileExt}`,
    );

    if (
      dryRun &&
      !reprocess &&
      cachedEntry?.status === "optimized" &&
      fs.existsSync(cachePath)
    ) {
      summary.optimized.push({
        path: file.path,
        kind: cachedEntry.kind,
        beforeBytes: cachedEntry.beforeBytes,
        afterBytes: cachedEntry.afterBytes,
        fromCache: true,
      });
      summary.beforeBytes += cachedEntry.beforeBytes ?? 0;
      summary.afterBytes += cachedEntry.afterBytes ?? 0;
      summary.fromCache.push(file.path);

      if (verbose) {
        console.log(
          `${label} cached ${file.path} — ${formatSavings(cachedEntry.beforeBytes, cachedEntry.afterBytes)}`,
        );
      }

      if (!verbose && index % OPTIMIZE_PROGRESS_EVERY === 0) {
        console.log(
          `Processed ${index} — optimized ${summary.optimized.length}, skipped ${summary.skipped.length}, cached ${summary.fromCache.length}, errors ${summary.errors.length}`,
        );
      }
      continue;
    }

    try {
      if (verbose) {
        console.log(`${label} download ${file.path}`);
      }

      const { data, error } = await supabase.storage.from(bucket).download(file.path);
      if (error) {
        throw new Error(error.message);
      }

      ensureParentDir(workPath);
      const inputBuffer = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(workPath, inputBuffer);

      const result = await optimizeFile(workPath, { dryRun: false });
      summary.beforeBytes += result.beforeBytes;
      summary.afterBytes +=
        result.status === "optimized" ? result.afterBytes : result.beforeBytes;

      if (result.status === "optimized") {
        if (fs.existsSync(cachePath)) {
          fs.unlinkSync(cachePath);
        }
        fs.renameSync(workPath, cachePath);

        setCachedEntry(manifest, file.path, {
          status: "optimized",
          kind: result.kind,
          beforeBytes: result.beforeBytes,
          afterBytes: result.afterBytes,
          processedAt: new Date().toISOString(),
        });
        manifestDirty = true;

        summary.optimized.push({
          path: file.path,
          kind: result.kind,
          beforeBytes: result.beforeBytes,
          afterBytes: result.afterBytes,
        });

        if (!dryRun) {
          const optimizedBuffer = fs.readFileSync(cachePath);
          await uploadOptimizedImage(supabase, bucket, file.path, optimizedBuffer);
        }

        if (verbose) {
          console.log(
            `${label} optimize ${file.path} — ${formatSavings(result.beforeBytes, result.afterBytes)}`,
          );
        }
      } else {
        if (fs.existsSync(workPath)) {
          fs.unlinkSync(workPath);
        }

        setCachedEntry(manifest, file.path, {
          status: "skipped",
          kind: result.kind,
          beforeBytes: result.beforeBytes,
          processedAt: new Date().toISOString(),
        });
        manifestDirty = true;

        summary.skipped.push({
          path: file.path,
          kind: result.kind,
          beforeBytes: result.beforeBytes,
        });
        if (verbose) {
          console.log(`${label} skip ${file.path} (${result.kind})`);
        }
      }
    } catch (error) {
      if (fs.existsSync(workPath)) {
        fs.unlinkSync(workPath);
      }

      const message = error instanceof Error ? error.message : String(error);
      summary.errors.push({ path: file.path, message });
      console.error(`${label} error ${file.path}: ${message}`);
    }

    if (manifestDirty && index % MANIFEST_SAVE_EVERY === 0) {
      flushManifest();
    }

    if (!verbose && index % OPTIMIZE_PROGRESS_EVERY === 0) {
      console.log(
        `Processed ${index} — optimized ${summary.optimized.length}, skipped ${summary.skipped.length}, cached ${summary.fromCache.length}, errors ${summary.errors.length}`,
      );
    }
  }

  flushManifest();

  if (index === 0) {
    console.log("");
    console.log("No images to optimize.");
    return;
  }

  console.log("");
  console.log(`Images processed: ${index}`);

  const savedBytes = summary.beforeBytes - summary.afterBytes;
  const savedPercent =
    summary.beforeBytes > 0
      ? ((savedBytes / summary.beforeBytes) * 100).toFixed(1)
      : "0.0";

  console.log("");
  console.log(`Would optimize / optimized: ${summary.optimized.length}`);
  console.log(`Skipped: ${summary.skipped.length}`);
  console.log(`Errors: ${summary.errors.length}`);
  console.log(
    `Total size: ${formatBytes(summary.beforeBytes)} → ${formatBytes(summary.afterBytes)}`,
  );
  console.log(`Saved: ${formatBytes(savedBytes)} (${savedPercent}%)`);
  console.log("");

  if (summary.optimized.length > 0) {
    const previewCount = verbose ? summary.optimized.length : Math.min(summary.optimized.length, 25);
    console.log(`${dryRun ? "Would optimize" : "Optimized"} (${summary.optimized.length}):`);
    for (const entry of summary.optimized.slice(0, previewCount)) {
      console.log(`  - ${entry.path} — ${formatSavings(entry.beforeBytes, entry.afterBytes)}`);
    }
    if (!verbose && summary.optimized.length > previewCount) {
      console.log(`  ... and ${summary.optimized.length - previewCount} more (use --verbose for full list)`);
    }
    console.log("");
  }

  if (verbose && summary.skipped.length > 0) {
    console.log(`Skipped (${summary.skipped.length}):`);
    for (const entry of summary.skipped) {
      console.log(`  - ${entry.path} (${entry.kind})`);
    }
    console.log("");
  } else if (summary.skipped.length > 0) {
    const skippedByKind = summary.skipped.reduce((counts, entry) => {
      counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
      return counts;
    }, new Map());

    console.log(`Skipped (${summary.skipped.length}):`);
    for (const [kind, count] of [...skippedByKind.entries()].sort()) {
      console.log(`  - ${kind}: ${count}`);
    }
    console.log("");
  }

  if (summary.errors.length > 0) {
    console.log(`Errors (${summary.errors.length}):`);
    for (const entry of summary.errors) {
      console.log(`  - ${entry.path}: ${entry.message}`);
    }
    console.log("");
  }

  if (dryRun && summary.optimized.length > 0) {
    const newlyOptimized = summary.optimized.filter((entry) => !entry.fromCache).length;
    console.log(`Cached optimized files: ${countManifestEntries(manifest, "optimized")}`);
    console.log(
      `Run with --optimize-images --apply to upload ${countManifestEntries(manifest, "optimized")} cached file(s) without re-processing.`,
    );
    if (newlyOptimized > 0) {
      console.log(`${newlyOptimized} file(s) were newly optimized this run.`);
    }
  }
}

async function runBlogPostCleanup({ supabase, bucket, folder, dryRun }) {
  console.log(
    `${dryRun ? "Dry run" : "Apply"}: blog post storage cleanup`,
  );
  console.log(`Bucket: ${bucket}`);
  console.log(`Folder: ${folder}/`);
  console.log("");

  const posts = await fetchBlogPostReferences(supabase);
  const { referencedPaths, referencesByPath } = collectReferencedPaths(
    posts,
    bucket,
  );

  const storageFiles = await listStorageFiles(supabase, bucket, folder);
  const storagePaths = new Set(storageFiles.map((file) => file.path));

  const referencedInFolder = [...referencedPaths].filter((objectPath) =>
    objectPath === folder || objectPath.startsWith(`${folder}/`),
  );

  const unusedFiles = storageFiles.filter(
    (file) => !referencedPaths.has(file.path),
  );
  const missingReferenced = referencedInFolder.filter(
    (objectPath) => !storagePaths.has(objectPath),
  );

  const totalReferencedBytes = storageFiles
    .filter((file) => referencedPaths.has(file.path))
    .reduce((sum, file) => sum + (file.size ?? 0), 0);
  const totalUnusedBytes = unusedFiles.reduce(
    (sum, file) => sum + (file.size ?? 0),
    0,
  );

  console.log(`Blog posts scanned: ${posts.length}`);
  console.log(`Referenced assets: ${referencedPaths.size}`);
  console.log(`Referenced in "${folder}/": ${referencedInFolder.length}`);
  console.log(`Storage files in "${folder}/": ${storageFiles.length}`);
  console.log(`Unused files: ${unusedFiles.length}`);
  console.log(
    `Storage used by referenced files: ${formatBytes(totalReferencedBytes)}`,
  );
  console.log(`Storage reclaimable: ${formatBytes(totalUnusedBytes)}`);
  console.log("");

  if (unusedFiles.length > 0) {
    console.log(`Unused files (${unusedFiles.length}):`);
    for (const file of unusedFiles.sort((a, b) => a.path.localeCompare(b.path))) {
      console.log(`  - ${file.path} (${formatBytes(file.size ?? 0)})`);
    }
    console.log("");
  } else {
    console.log("No unused files found.");
    console.log("");
  }

  if (missingReferenced.length > 0) {
    console.log(
      `Referenced in blog_posts.reference but missing from storage (${missingReferenced.length}):`,
    );
    for (const objectPath of missingReferenced.sort()) {
      const refs = referencesByPath.get(objectPath) ?? [];
      const postSummary = refs
        .map((ref) => `#${ref.postId} (${ref.slug})`)
        .join(", ");
      console.log(`  - ${objectPath}${postSummary ? ` ← ${postSummary}` : ""}`);
    }
    console.log("");
  }

  if (dryRun) {
    if (unusedFiles.length > 0) {
      console.log(
        `Run with --apply to delete ${unusedFiles.length} unused file(s).`,
      );
    }
    return;
  }

  if (unusedFiles.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  const pathsToDelete = unusedFiles.map((file) => file.path);
  const deletedCount = await deleteStorageFiles(supabase, bucket, pathsToDelete);

  console.log(`Deleted ${deletedCount}/${pathsToDelete.length} unused file(s).`);
}

async function main() {
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket =
    options.bucket ||
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
    DEFAULT_BUCKET;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (options.optimizeImages) {
    if (options.optimizeFolders.length === 0) {
      throw new Error("At least one optimize folder is required");
    }

    await runOptimizeImages({
      supabase,
      bucket,
      folders: options.optimizeFolders,
      dryRun,
      verbose: options.verbose,
      reprocess: options.reprocess,
    });
    return;
  }

  const folder = normalizeStoragePath(options.folder);
  if (!folder) {
    throw new Error("Storage folder is required");
  }

  await runBlogPostCleanup({ supabase, bucket, folder, dryRun });
}
