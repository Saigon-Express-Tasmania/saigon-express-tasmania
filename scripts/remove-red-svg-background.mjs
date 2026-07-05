#!/usr/bin/env node
/**
 * Remove the solid #FF0000 background from Open Food Facts–style allergen SVGs,
 * leaving a transparent canvas with only the white foreground shapes.
 *
 * Typical source structure (refs/openfoodfacts-server/.../attributes/src/*.svg):
 *   <rect style="fill:#ff0000;stroke:none" width="24" height="24" ... />
 *   <path style="fill:#ffffff;..." d="..." />
 *
 * Usage:
 *   node scripts/remove-red-svg-background.mjs refs/openfoodfacts-server/html/images/attributes/src/contains-crustaceans.svg
 *   node scripts/remove-red-svg-background.mjs refs/openfoodfacts-server/html/images/attributes/src/contains-crustaceans.svg -o public/images/allergens/crustacean.svg
 *   node scripts/remove-red-svg-background.mjs refs/openfoodfacts-server/html/images/attributes/src --recursive -o public/images/allergens
 *   node scripts/remove-red-svg-background.mjs input.svg --in-place
 *
 * Options:
 *   -o, --output <path>   Output file or directory (batch mode)
 *   --in-place            Overwrite each input SVG
 *   --recursive           Process directories recursively
 *   --keep-metadata       Keep Inkscape / Sodipodi editor metadata
 *   --dry-run             Print actions without writing files
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.error(`Usage: node scripts/remove-red-svg-background.mjs <file-or-dir> [options]

Options:
  -o, --output <path>   Output file or directory
  --in-place            Overwrite inputs
  --recursive           Walk directories recursively
  --keep-metadata       Keep Inkscape / Sodipodi metadata blocks
  --dry-run             Preview only`);
}

function parseArgs(argv) {
  const options = {
    inputs: [],
    output: null,
    inPlace: false,
    recursive: false,
    keepMetadata: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "-o":
      case "--output":
        options.output = argv[i + 1];
        i += 1;
        break;
      case "--in-place":
        options.inPlace = true;
        break;
      case "--recursive":
        options.recursive = true;
        break;
      case "--keep-metadata":
        options.keepMetadata = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "-h":
      case "--help":
        usage();
        process.exit(0);
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        options.inputs.push(arg);
    }
  }

  if (options.inputs.length === 0) {
    usage();
    process.exit(1);
  }

  if (options.inPlace && options.output) {
    throw new Error("Use either --in-place or --output, not both.");
  }

  return options;
}

function resolveInput(input) {
  return path.isAbsolute(input) ? input : path.join(root, input);
}

function normalizeColor(value) {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith("url(")) return trimmed;

  const hexMatch = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    return `#${hex}`;
  }

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/i,
  );
  if (rgbMatch) {
    const [r, g, b] = rgbMatch.slice(1, 4).map(Number);
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }

  return trimmed;
}

function isRedFill(value) {
  const normalized = normalizeColor(value);
  return (
    normalized === "#ff0000" ||
    normalized === "red" ||
    normalized === "rgb(255,0,0)" ||
    normalized === "rgb(255, 0, 0)"
  );
}

function parseStyle(styleValue) {
  const styles = {};
  for (const part of styleValue.split(";")) {
    const [rawKey, rawValue] = part.split(":");
    if (!rawKey || !rawValue) continue;
    styles[rawKey.trim().toLowerCase()] = rawValue.trim();
  }
  return styles;
}

function openTagUsesRedFill(openTag) {
  const fillMatch = openTag.match(/\bfill=(["'])(.*?)\1/i);
  if (fillMatch && isRedFill(fillMatch[2])) return true;

  const styleMatch = openTag.match(/\bstyle=(["'])(.*?)\1/i);
  if (styleMatch && isRedFill(parseStyle(styleMatch[2]).fill)) return true;

  return false;
}

function removeRedElements(svg) {
  const selfClosingPattern =
    /<(rect|circle|ellipse|path|polygon|polyline)(\s[^>]*?)\/>/gi;
  const pairedPattern =
    /<(rect|circle|ellipse|path|polygon|polyline)(\s[^>]*?)>([\s\S]*?)<\/\1>/gi;

  let removed = 0;

  let output = svg.replace(selfClosingPattern, (match, tagName, attrs) => {
    const openTag = `<${tagName}${attrs}/>`;
    if (!openTagUsesRedFill(openTag)) return match;
    removed += 1;
    return "";
  });

  output = output.replace(pairedPattern, (match, tagName, attrs, inner) => {
    const openTag = `<${tagName}${attrs}>`;
    if (!openTagUsesRedFill(openTag)) return match;
    removed += 1;
    return "";
  });

  return { output, removed };
}

function stripEditorMetadata(svg) {
  return svg
    .replace(/\s*<metadata[\s\S]*?<\/metadata>\s*/gi, "\n")
    .replace(/\s*<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>\s*/gi, "\n")
    .replace(/\s*<sodipodi:namedview[\s\S]*?\/>/gi, "\n")
    .replace(/\s*xmlns:sodipodi="[^"]*"/gi, "")
    .replace(/\s*xmlns:inkscape="[^"]*"/gi, "")
    .replace(/\s*xmlns:dc="[^"]*"/gi, "")
    .replace(/\s*xmlns:cc="[^"]*"/gi, "")
    .replace(/\s*xmlns:rdf="[^"]*"/gi, "")
    .replace(/\s*sodipodi:[a-z-]+="[^"]*"/gi, "")
    .replace(/\s*inkscape:[a-z-]+="[^"]*"/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimStart();
}

function processSvg(input, { keepMetadata }) {
  const { output: withoutRed, removed } = removeRedElements(input);
  const output = keepMetadata ? withoutRed : stripEditorMetadata(withoutRed);
  return { output, removed };
}

function defaultOutputPath(inputPath) {
  const ext = path.extname(inputPath);
  const base = inputPath.slice(0, -ext.length);
  return `${base}-transparent${ext}`;
}

function collectSvgFiles(inputPath, recursive) {
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) {
    return path.extname(inputPath).toLowerCase() === ".svg" ? [inputPath] : [];
  }

  const files = [];
  for (const entry of fs.readdirSync(inputPath, { withFileTypes: true })) {
    const fullPath = path.join(inputPath, entry.name);
    if (entry.isDirectory()) {
      if (recursive) files.push(...collectSvgFiles(fullPath, recursive));
      continue;
    }
    if (path.extname(entry.name).toLowerCase() === ".svg") {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function resolveOutputPath(inputPath, inputRoot, options) {
  if (options.inPlace) return inputPath;

  if (
    options.output &&
    fs.existsSync(options.output) &&
    fs.statSync(options.output).isDirectory()
  ) {
    return path.join(options.output, path.basename(inputPath));
  }

  if (options.output) return resolveInput(options.output);

  return defaultOutputPath(inputPath);
}

function writeFile(inputPath, inputRoot, options) {
  const input = fs.readFileSync(inputPath, "utf8");
  const { output, removed } = processSvg(input, options);
  const outputPath = resolveOutputPath(inputPath, inputRoot, options);

  if (options.dryRun) {
    console.log(
      `[dry-run] ${inputPath} -> ${outputPath} (${removed} red element(s) removed)`,
    );
    return { removed, changed: removed > 0 };
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output.endsWith("\n") ? output : `${output}\n`);
  console.log(`${inputPath} -> ${outputPath} (${removed} red element(s) removed)`);
  return { removed, changed: removed > 0 };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const resolvedInputs = options.inputs.map(resolveInput);

  let total = 0;
  let changed = 0;

  for (const inputPath of resolvedInputs) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input not found: ${inputPath}`);
    }

    const inputRoot = fs.statSync(inputPath).isDirectory()
      ? inputPath
      : path.dirname(inputPath);
    const files = collectSvgFiles(inputPath, options.recursive);

    if (files.length === 0) {
      console.warn(`No SVG files found in: ${inputPath}`);
      continue;
    }

    for (const filePath of files) {
      const result = writeFile(filePath, inputRoot, options);
      total += 1;
      if (result.changed) changed += 1;
    }
  }

  if (total === 0) {
    process.exit(1);
  }

  console.log(`Done: ${changed}/${total} file(s) had a red background removed.`);
}

main();
