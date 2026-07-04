#!/usr/bin/env node
/**
 * Scrape Catering Project category pages from refs/cateringproject/categories.json.
 *
 * For each category:
 * - create refs/cateringproject/htmls/<slug>/
 * - scrape the base page with the Jina mirror
 * - scrape ?page=2 through ?page=5 with the same mirror
 * - save mirrored markdown + wrapped HTML snapshots
 * - download all exposed image URLs into per-page asset folders
 *
 * Usage:
 *   node scripts/scrape-cateringproject-categories.mjs
 *   node scripts/scrape-cateringproject-categories.mjs --slugs=morning-tea-sweet,morning-tea-savoury
 *   node scripts/scrape-cateringproject-categories.mjs --limit=3 --skip-existing
 *   node scripts/scrape-cateringproject-categories.mjs --categories refs/cateringproject/categories.json
 *   node scripts/scrape-cateringproject-categories.mjs --out refs/cateringproject/htmls
 *   node scripts/scrape-cateringproject-categories.mjs --pages=5
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_CATEGORIES_PATH = path.join(root, "refs/cateringproject/categories.json");
const DEFAULT_OUTPUT_ROOT = path.join(root, "refs/cateringproject/htmls");

const args = process.argv.slice(2);
const options = parseArgs(args);
const categoriesPath = path.resolve(root, options.categoriesPath);
const outputRoot = path.resolve(root, options.outputRoot);

const IMAGE_MD_RE = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});

async function main() {
  const categoryGroups = readJson(categoriesPath);
  const categories = flattenCategories(categoryGroups);
  const filteredCategories = filterCategories(categories, options);

  fs.mkdirSync(outputRoot, { recursive: true });

  const summary = {
    generated_at: new Date().toISOString(),
    categories_path: categoriesPath,
    output_root: outputRoot,
    pages: [1, ...rangePages(options.maxPage).filter((page) => page > 1)],
    count: filteredCategories.length,
    categories: [],
  };

  console.log(`Scraping ${filteredCategories.length} categories...`);

  for (const [index, category] of filteredCategories.entries()) {
    const categoryFolder = path.join(outputRoot, category.slug);
    fs.mkdirSync(categoryFolder, { recursive: true });

    const categorySummary = {
      slug: category.slug,
      name: category.name,
      category_group: category.categoryGroup,
      source_url: category.link,
      pages: [],
    };

    console.log(
      `[${index + 1}/${filteredCategories.length}] ${category.slug} (${category.name})`,
    );

    for (const page of rangePages(options.maxPage)) {
      const isBasePage = page === 1;
      const sourceUrl = isBasePage ? category.link : `${category.link}?page=${page}`;
      const mirroredUrl = mirrorUrl(sourceUrl);
      const fileStem = isBasePage ? category.slug : `${category.slug}-page-${page}`;
      const mdPath = path.join(categoryFolder, `${fileStem}.jina.md`);
      const htmlPath = path.join(categoryFolder, `${fileStem}.jina.html`);
      const assetsDir = path.join(categoryFolder, `${fileStem}_assets`);
      const assetsManifestPath = path.join(categoryFolder, `${fileStem}_assets.tsv`);

      if (
        options.skipExisting &&
        fs.existsSync(mdPath) &&
        fs.existsSync(htmlPath) &&
        fs.existsSync(assetsManifestPath) &&
        !options.force
      ) {
        categorySummary.pages.push({
          page,
          source_url: sourceUrl,
          mirror_url: mirroredUrl,
          skipped: true,
        });
        console.log(`  page ${page}: skipped (existing files)`);
        continue;
      }

      fs.mkdirSync(assetsDir, { recursive: true });

      const markdownText = await fetchText(mirroredUrl, {
        retries: 3,
        timeoutMs: 60000,
      });
      fs.writeFileSync(mdPath, markdownText, "utf8");
      fs.writeFileSync(
        htmlPath,
        wrapMirroredHtml(sourceUrl, `${category.name} (page ${page})`, markdownText),
        "utf8",
      );

      const imageEntries = extractImageEntries(markdownText);
      const manifestLines = ["alt\turl\tfile\tstatus\tbytes"];
      const downloadedAssets = [];
      let imageOk = 0;
      let imageSkipped = 0;

      for (const [imageIndex, image] of imageEntries.entries()) {
        const extName = extFromUrl(image.url) || ".bin";
        const fileBase = basenameFromUrl(image.url) || `image_${imageIndex + 1}`;
        const safeName = `${String(imageIndex + 1).padStart(3, "0")}_${sanitizeFilename(
          fileBase,
        )}${extName}`;
        const destination = path.join(assetsDir, safeName);

        try {
          const buffer = await fetchBuffer(image.url, {
            retries: 2,
            timeoutMs: 45000,
          });
          fs.writeFileSync(destination, buffer);
          manifestLines.push(
            `${sanitizeTsv(image.alt)}\t${sanitizeTsv(image.url)}\t${path.posix.join(
              path.basename(assetsDir),
              safeName,
            )}\tOK\t${buffer.length}`,
          );
          downloadedAssets.push({
            alt: image.alt,
            url: image.url,
            file: path.posix.join(path.basename(assetsDir), safeName),
            bytes: buffer.length,
          });
          imageOk += 1;
        } catch (error) {
          safeUnlink(destination);
          manifestLines.push(
            `${sanitizeTsv(image.alt)}\t${sanitizeTsv(image.url)}\t${path.posix.join(
              path.basename(assetsDir),
              safeName,
            )}\tSKIP: ${sanitizeTsv(String(error?.message || error))}\t0`,
          );
          imageSkipped += 1;
        }
      }

      fs.writeFileSync(`${assetsManifestPath}`, `${manifestLines.join("\n")}\n`, "utf8");

      categorySummary.pages.push({
        page,
        source_url: sourceUrl,
        mirror_url: mirroredUrl,
        files: {
          markdown: relativizeToRoot(mdPath),
          html: relativizeToRoot(htmlPath),
          assets_manifest: relativizeToRoot(assetsManifestPath),
        },
        images_downloaded: imageOk,
        images_skipped: imageSkipped,
        downloaded_assets: downloadedAssets,
      });

      console.log(
        `  page ${page}: scraped (${imageOk} images, ${imageSkipped} skipped)`,
      );
    }

    fs.writeFileSync(
      path.join(categoryFolder, "_summary.json"),
      `${JSON.stringify(categorySummary, null, 2)}\n`,
      "utf8",
    );
    summary.categories.push(categorySummary);
  }

  fs.writeFileSync(
    path.join(outputRoot, "_category-scrape-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}

function parseArgs(inputArgs) {
  const result = {
    categoriesPath: relativizeToRoot(DEFAULT_CATEGORIES_PATH),
    outputRoot: relativizeToRoot(DEFAULT_OUTPUT_ROOT),
    skipExisting: false,
    force: false,
    limit: null,
    slugs: null,
    maxPage: 5,
  };

  for (const arg of inputArgs) {
    if (arg === "--skip-existing") result.skipExisting = true;
    else if (arg === "--force") result.force = true;
    else if (arg.startsWith("--categories=")) {
      result.categoriesPath = arg.slice("--categories=".length);
    } else if (arg.startsWith("--out=")) {
      result.outputRoot = arg.slice("--out=".length);
    } else if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      result.limit = Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
    } else if (arg.startsWith("--pages=")) {
      const value = Number(arg.slice("--pages=".length));
      result.maxPage = Number.isFinite(value) && value >= 1 ? Math.floor(value) : 5;
    } else if (arg.startsWith("--slugs=")) {
      const values = arg
        .slice("--slugs=".length)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      result.slugs = values.length ? new Set(values) : null;
    }
  }

  return result;
}

function flattenCategories(categoryGroups) {
  const categories = [];
  for (const group of Array.isArray(categoryGroups) ? categoryGroups : []) {
    for (const category of Array.isArray(group.categories) ? group.categories : []) {
      if (!category?.slug || !category?.link) continue;
      categories.push({
        categoryGroup: group.categoryGroup ?? null,
        groupSlug: group.slug ?? null,
        name: category.name ?? category.slug,
        slug: category.slug,
        link: category.link,
      });
    }
  }
  return categories;
}

function filterCategories(categories, currentOptions) {
  let filtered = [...categories];

  if (currentOptions.slugs) {
    filtered = filtered.filter((category) => currentOptions.slugs.has(category.slug));
  }

  if (currentOptions.limit) {
    filtered = filtered.slice(0, currentOptions.limit);
  }

  return filtered;
}

function rangePages(maxPage) {
  return Array.from({ length: Math.max(1, maxPage) }, (_, index) => index + 1);
}

function extractImageEntries(markdownText) {
  const entries = [];
  const seen = new Set();
  for (const match of markdownText.matchAll(IMAGE_MD_RE)) {
    const alt = cleanText(match[1] ?? "");
    const url = cleanText(match[2] ?? "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    entries.push({ alt, url });
  }
  return entries;
}

function mirrorUrl(sourceUrl) {
  return `https://r.jina.ai/http://${encodeURI(sourceUrl)}`;
}

async function fetchText(url, { retries = 3, timeoutMs = 60000 } = {}) {
  const response = await fetchWithRetry(url, { retries, timeoutMs });
  return response.text();
}

async function fetchBuffer(url, { retries = 2, timeoutMs = 45000 } = {}) {
  const response = await fetchWithRetry(url, { retries, timeoutMs });
  return Buffer.from(await response.arrayBuffer());
}

async function fetchWithRetry(url, { retries = 3, timeoutMs = 60000 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        },
      });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${url}`);
      }
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < retries) await sleep(500 * attempt);
    }
  }

  throw lastError;
}

function wrapMirroredHtml(sourceUrl, title, markdownText) {
  const escaped = escapeHtml(markdownText);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)} - mirrored scrape</title>`,
    "<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;line-height:1.6}pre{white-space:pre-wrap;word-break:break-word}a{word-break:break-word}</style>",
    "</head>",
    "<body>",
    `<p><strong>Source:</strong> <a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a></p>`,
    "<p><strong>Note:</strong> Raw site HTML was Cloudflare-protected during scrape; this file is rendered from a mirrored text snapshot.</p>",
    `<pre>${escaped}</pre>`,
    "</body>",
    "</html>",
    "",
  ].join("");
}

function basenameFromUrl(url) {
  try {
    return path.basename(new URL(url).pathname);
  } catch {
    return "";
  }
}

function extFromUrl(url) {
  try {
    return path.extname(new URL(url).pathname);
  } catch {
    return "";
  }
}

function sanitizeFilename(value) {
  return String(value ?? "")
    .replace(/\?.*$/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "asset";
}

function sanitizeTsv(value) {
  return String(value ?? "").replace(/\t/g, " ").replace(/[\r\n]+/g, " ").trim();
}

function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup failures
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\ufffd/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relativizeToRoot(absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
