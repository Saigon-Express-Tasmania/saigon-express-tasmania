#!/usr/bin/env node
/**
 * Optimize all scraped Catering Project images in place.
 *
 * Walks refs/cateringproject/htmls recursively, including:
 *   - category listing assets (*_assets/)
 *   - product-htmls asset folders
 *   - generated product images (images/<slug>/)
 *
 * Usage:
 *   node scripts/optimize-cateringproject-images.mjs
 *   node scripts/optimize-cateringproject-images.mjs --dry-run
 *   node scripts/optimize-cateringproject-images.mjs --force
 *   node scripts/optimize-cateringproject-images.mjs --category-slugs=afternoon-tea-disposables,morning-tea-sweet
 *   node scripts/optimize-cateringproject-images.mjs --html-root refs/cateringproject/htmls
 *
 * Notes:
 *   - Only overwrites files when the optimized output is smaller.
 *   - Use --force to overwrite even when the size does not improve.
 *   - Raster formats are optimized with sharp.
 *   - SVG files are minified with svgo.
 *   - Animated GIF images are skipped.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatBytes, gatherImageFiles, runImageOptimization } from "./lib/image-optimize.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_HTML_ROOT = path.join(root, "refs/cateringproject/htmls");

const options = parseArgs(process.argv.slice(2));
const htmlRoot = path.resolve(root, options.htmlRoot);

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});

async function main() {
  const targets = resolveTargets();

  console.log(
    `${options.dryRun ? "Dry run:" : "Optimizing:"} ${targets
      .map((target) => relativize(target))
      .join(", ")}`,
  );
  console.log(`Found ${gatherImageFiles(targets).length} image files.\n`);

  const summary = await runImageOptimization({
    targets,
    dryRun: options.dryRun,
    force: options.force,
    relativePath: relativize,
    onMissingTarget: (target) => {
      console.warn(`skip missing directory: ${relativize(target)}`);
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

  console.log("\nSummary");
  console.log(`  optimized: ${summary.optimized}`);
  console.log(`  skipped: ${summary.skipped}`);
  console.log(`  unsupported: ${summary.unsupported}`);
  console.log(`  animated: ${summary.animated}`);
  console.log(
    `  total size: ${formatBytes(summary.beforeBytes)} -> ${formatBytes(summary.afterBytes)} (${formatBytes(summary.saved_bytes)} saved, ${summary.saved_percent}%)`,
  );

  fs.writeFileSync(
    path.join(htmlRoot, "_optimize-images-summary.json"),
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        html_root: htmlRoot,
        dry_run: options.dryRun,
        force: options.force,
        category_slugs: options.categorySlugs ? [...options.categorySlugs] : null,
        ...summary,
        files: undefined,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function parseArgs(inputArgs) {
  const result = {
    htmlRoot: relativize(DEFAULT_HTML_ROOT),
    categorySlugs: null,
    dryRun: false,
    force: false,
  };

  for (const arg of inputArgs) {
    if (arg.startsWith("--html-root=")) {
      result.htmlRoot = arg.slice("--html-root=".length);
    } else if (arg.startsWith("--category-slugs=")) {
      const values = arg
        .slice("--category-slugs=".length)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      result.categorySlugs = values.length ? new Set(values) : null;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    } else if (arg === "--force") {
      result.force = true;
    }
  }

  return result;
}

function resolveTargets() {
  if (!fs.existsSync(htmlRoot)) {
    throw new Error(`HTML root not found: ${htmlRoot}`);
  }

  if (options.categorySlugs) {
    return [...options.categorySlugs]
      .sort((a, b) => a.localeCompare(b))
      .map((slug) => path.join(htmlRoot, slug));
  }

  return [htmlRoot];
}

function relativize(absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/");
}
