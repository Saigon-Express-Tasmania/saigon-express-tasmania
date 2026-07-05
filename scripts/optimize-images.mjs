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

import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatBytes, gatherImageFiles, runImageOptimization } from "./lib/image-optimize.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TARGETS = ["public/images", "public/manus-storage"];

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const force = argv.includes("--force");
const targetArgs = argv.filter((arg) => !arg.startsWith("--"));

function resolveTarget(target) {
  return path.isAbsolute(target) ? target : path.join(root, target);
}

function relativeToRoot(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
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

async function main() {
  const targets = buildTargets();

  console.log(
    `${dryRun ? "Dry run:" : "Optimizing:"} ${targets
      .map((target) => relativeToRoot(target))
      .join(", ")}`,
  );
  console.log(`Found ${gatherImageFiles(targets).length} image files.\n`);

  const summary = await runImageOptimization({
    targets,
    dryRun,
    force,
    relativePath: relativeToRoot,
    onMissingTarget: (target) => {
      console.warn(`skip missing directory: ${relativeToRoot(target)}`);
    },
    onResult: (result, entry) => {
      if (result.status === "optimized") {
        const savedPct =
          result.beforeBytes > 0
            ? (((result.beforeBytes - result.afterBytes) / result.beforeBytes) * 100).toFixed(1)
            : "0.0";
        console.log(
          `optimized ${entry.path} (${formatBytes(result.beforeBytes)} -> ${formatBytes(result.afterBytes)}, saved ${savedPct}%)`,
        );
        return;
      }
      console.log(`skipped   ${entry.path} (${result.kind})`);
    },
  });

  if (summary.file_count === 0) {
    return;
  }

  console.log("\nSummary");
  console.log(`  optimized: ${summary.optimized}`);
  console.log(`  skipped: ${summary.skipped}`);
  console.log(`  unsupported: ${summary.unsupported}`);
  console.log(`  animated: ${summary.animated}`);
  console.log(
    `  total size: ${formatBytes(summary.beforeBytes)} -> ${formatBytes(summary.afterBytes)} (${formatBytes(summary.saved_bytes)} saved, ${summary.saved_percent}%)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
