import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { optimize as optimizeSvg } from "svgo";

export const RASTER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
export const SVG_EXTENSIONS = new Set([".svg"]);
export const SKIPPED_EXTENSIONS = new Set([".gif"]);

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function walkFiles(dir, files = []) {
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

export function gatherImageFiles(targets) {
  const files = [];

  for (const target of targets) {
    if (!fs.existsSync(target)) {
      continue;
    }
    if (!fs.statSync(target).isDirectory()) {
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

export async function optimizeRaster(filePath, { dryRun = false, force = false } = {}) {
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

export function optimizeSvgFile(filePath, { dryRun = false, force = false } = {}) {
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

export async function optimizeFile(filePath, options = {}) {
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
    return optimizeSvgFile(filePath, options);
  }

  if (RASTER_EXTENSIONS.has(ext)) {
    return optimizeRaster(filePath, options);
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

export async function runImageOptimization({
  targets,
  dryRun = false,
  force = false,
  relativePath = (filePath) => filePath,
  onMissingTarget,
  onResult,
}) {
  const existingTargets = [];
  for (const target of targets) {
    if (!fs.existsSync(target)) {
      onMissingTarget?.(target);
      continue;
    }
    if (!fs.statSync(target).isDirectory()) {
      onMissingTarget?.(target);
      continue;
    }
    existingTargets.push(target);
  }

  const files = gatherImageFiles(existingTargets);
  const totals = {
    targets: existingTargets.map(relativePath),
    file_count: files.length,
    optimized: 0,
    skipped: 0,
    unsupported: 0,
    animated: 0,
    beforeBytes: 0,
    afterBytes: 0,
    files: [],
  };

  for (const filePath of files) {
    const result = await optimizeFile(filePath, { dryRun, force });
    totals.beforeBytes += result.beforeBytes;
    totals.afterBytes += result.status === "optimized" ? result.afterBytes : result.beforeBytes;

    if (result.status === "optimized") {
      totals.optimized += 1;
    } else {
      totals.skipped += 1;
      if (result.kind === "unsupported") totals.unsupported += 1;
      if (result.kind === "animated") totals.animated += 1;
    }

    const entry = {
      path: relativePath(result.filePath),
      status: result.status,
      kind: result.kind,
      before_bytes: result.beforeBytes,
      after_bytes: result.afterBytes,
    };
    totals.files.push(entry);
    onResult?.(result, entry);
  }

  totals.saved_bytes = totals.beforeBytes - totals.afterBytes;
  totals.saved_percent =
    totals.beforeBytes > 0
      ? Number(((totals.saved_bytes / totals.beforeBytes) * 100).toFixed(1))
      : 0;

  return totals;
}
