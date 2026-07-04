#!/usr/bin/env node
/**
 * Optimize image assets in place.
 *
 * Defaults to:
 *   - public/images
 *   - public/manus-storage
 *
 * Usage:
 *   node scripts/optimize-images.mjs
 *   node scripts/optimize-images.mjs --dry-run
 *   node scripts/optimize-images.mjs public/images
 *   node scripts/optimize-images.mjs public/images public/manus-storage --force
 *
 * Notes:
 *   - Only overwrites files when the optimized output is smaller.
 *   - Use --force to overwrite even when the size does not improve.
 *   - Raster formats are optimized with sharp.
 *   - SVG files are minified with svgo.
 *   - Animated images are skipped.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { optimize as optimizeSvg } from "svgo";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TARGETS = ["public/images", "public/manus-storage"];
const RASTER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const SVG_EXTENSIONS = new Set([".svg"]);
const SKIPPED_EXTENSIONS = new Set([".gif"]);

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const force = argv.includes("--force");
const targetArgs = argv.filter((arg) => !arg.startsWith("--"));

function resolveTarget(target) {
  return path.isAbsolute(target) ? target : path.join(root, target);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function relativeToRoot(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function walkFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function buildTargets() {
  const targets = (targetArgs.length > 0 ? targetArgs : DEFAULT_TARGETS)
    .map(resolveTarget)
    .filter((target, index, list) => list.indexOf(target) === index);

  if (targets.length === 0) {
    throw new Error("No target directories were provided.");
  }

  return targets;
}

function gatherImageFiles(targets) {
  const files = [];

  for (const target of targets) {
    if (!fs.existsSync(target)) {
      console.warn(`skip missing directory: ${relativeToRoot(target)}`);
      continue;
    }
    if (!fs.statSync(target).isDirectory()) {
      console.warn(`skip non-directory target: ${relativeToRoot(target)}`);
      continue;
    }

    for (const filePath of walkFiles(target)) {
      const ext = path.extname(filePath).toLowerCase();
      if (RASTER_EXTENSIONS.has(ext) || SVG_EXTENSIONS.has(ext) || SKIPPED_EXTENSIONS.has(ext)) {
        files.push(filePath);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function optimizeRaster(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const inputBuffer = fs.readFileSync(filePath);
  const source = sharp(inputBuffer, { animated: true });
  const metadata = await source.metadata();

  if ((metadata.pages ?? 1) > 1) {
    return {
      status: "skipped",
      kind: "animated",
      filePath,
      beforeBytes: inputBuffer.length,
      afterBytes: inputBuffer.length,
    };
  }

  let pipeline = sharp(inputBuffer).rotate();

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      pipeline = pipeline.jpeg({
        quality: 82,
        progressive: true,
        mozjpeg: true,
      });
      break;
    case ".png":
      pipeline = pipeline.png({
        compressionLevel: 9,
        effort: 10,
        adaptiveFiltering: true,
      });
      break;
    case ".webp":
      pipeline = pipeline.webp({
        quality: 82,
        effort: 6,
      });
      break;
    case ".avif":
      pipeline = pipeline.avif({
        quality: 55,
        effort: 7,
      });
      break;
    default:
      return {
        status: "skipped",
        kind: "unsupported",
        filePath,
        beforeBytes: inputBuffer.length,
        afterBytes: inputBuffer.length,
      };
  }

  const outputBuffer = await pipeline.toBuffer();
  const shouldWrite = force || outputBuffer.length < inputBuffer.length;

  if (shouldWrite && !dryRun) {
    fs.writeFileSync(filePath, outputBuffer);
  }

  return {
    status: shouldWrite ? "optimized" : "skipped",
    kind: shouldWrite ? "raster" : "not-smaller",
    filePath,
    beforeBytes: inputBuffer.length,
    afterBytes: outputBuffer.length,
  };
}

function optimizeSvgFile(filePath) {
  const input = fs.readFileSync(filePath, "utf8");
  const result = optimizeSvg(input, {
    path: filePath,
    multipass: true,
  });

  if ("error" in result) {
    throw new Error(result.error);
  }

  const output = result.data;
  const beforeBytes = Buffer.byteLength(input);
  const afterBytes = Buffer.byteLength(output);
  const shouldWrite = force || afterBytes < beforeBytes;

  if (shouldWrite && !dryRun) {
    fs.writeFileSync(filePath, output);
  }

  return {
    status: shouldWrite ? "optimized" : "skipped",
    kind: shouldWrite ? "svg" : "not-smaller",
    filePath,
    beforeBytes,
    afterBytes,
  };
}

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (SKIPPED_EXTENSIONS.has(ext)) {
    const size = fs.statSync(filePath).size;
    return {
      status: "skipped",
      kind: "unsupported",
      filePath,
      beforeBytes: size,
      afterBytes: size,
    };
  }

  if (SVG_EXTENSIONS.has(ext)) {
    return optimizeSvgFile(filePath);
  }

  if (RASTER_EXTENSIONS.has(ext)) {
    return optimizeRaster(filePath);
  }

  const size = fs.statSync(filePath).size;
  return {
    status: "skipped",
    kind: "unsupported",
    filePath,
    beforeBytes: size,
    afterBytes: size,
  };
}

async function main() {
  const targets = buildTargets();
  const files = gatherImageFiles(targets);

  console.log(
    `${dryRun ? "Dry run:" : "Optimizing:"} ${targets
      .map((target) => relativeToRoot(target))
      .join(", ")}`,
  );
  console.log(`Found ${files.length} image files.\n`);

  if (files.length === 0) {
    return;
  }

  const totals = {
    optimized: 0,
    skipped: 0,
    unsupported: 0,
    animated: 0,
    beforeBytes: 0,
    afterBytes: 0,
  };

  for (const filePath of files) {
    const result = await optimizeFile(filePath);
    totals.beforeBytes += result.beforeBytes;
    totals.afterBytes += result.status === "optimized" ? result.afterBytes : result.beforeBytes;

    if (result.status === "optimized") {
      totals.optimized += 1;
      const savedBytes = result.beforeBytes - result.afterBytes;
      const savedPct =
        result.beforeBytes > 0
          ? ((savedBytes / result.beforeBytes) * 100).toFixed(1)
          : "0.0";
      console.log(
        `optimized ${relativeToRoot(result.filePath)} (${formatBytes(result.beforeBytes)} -> ${formatBytes(result.afterBytes)}, saved ${savedPct}%)`,
      );
      continue;
    }

    totals.skipped += 1;
    if (result.kind === "unsupported") totals.unsupported += 1;
    if (result.kind === "animated") totals.animated += 1;
    console.log(`skipped   ${relativeToRoot(result.filePath)} (${result.kind})`);
  }

  const totalSavedBytes = totals.beforeBytes - totals.afterBytes;
  const totalSavedPct =
    totals.beforeBytes > 0
      ? ((totalSavedBytes / totals.beforeBytes) * 100).toFixed(1)
      : "0.0";

  console.log("\nSummary");
  console.log(`  optimized: ${totals.optimized}`);
  console.log(`  skipped: ${totals.skipped}`);
  console.log(`  unsupported: ${totals.unsupported}`);
  console.log(`  animated: ${totals.animated}`);
  console.log(
    `  total size: ${formatBytes(totals.beforeBytes)} -> ${formatBytes(totals.afterBytes)} (${formatBytes(totalSavedBytes)} saved, ${totalSavedPct}%)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
