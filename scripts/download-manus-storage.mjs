import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "public", "manus-storage");
const BASE_URL = "https://saigonexpresstasmania.com";

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (/\.(tsx?|jsx?|css)$/.test(entry)) files.push(full);
  }
  return files;
}

function collectPaths() {
  const paths = new Set();
  for (const file of walk(SRC_DIR)) {
    const content = fs.readFileSync(file, "utf8");
    const re = /\/manus-storage\/[^"'`\s)]+/g;
    let match;
    while ((match = re.exec(content))) {
      let assetPath = match[0].replace(/[,]+$/, "");
      paths.add(assetPath);
    }
  }
  return [...paths].sort();
}

async function downloadAsset(assetPath) {
  const filename = path.basename(assetPath);
  const outPath = path.join(OUT_DIR, filename);
  const url = `${BASE_URL}${assetPath.split("/").map(encodeURIComponent).join("/").replace("%2F", "/")}`;

  // Encode only the filename segment, keep path structure
  const encodedUrl = `${BASE_URL}/manus-storage/${encodeURIComponent(filename)}`;

  if (fs.existsSync(outPath)) {
    const stat = fs.statSync(outPath);
    if (stat.size > 0) {
      console.log(`skip (exists): ${filename}`);
      return { filename, status: "skipped" };
    }
  }

  const res = await fetch(encodedUrl);
  if (!res.ok) {
    console.error(`FAIL ${res.status}: ${encodedUrl}`);
    return { filename, status: "failed", statusCode: res.status };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`ok: ${filename} (${buffer.length} bytes)`);
  return { filename, status: "ok", bytes: buffer.length };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const assetPaths = collectPaths();
  console.log(`Found ${assetPaths.length} unique /manus-storage assets in src/\n`);

  const results = { ok: 0, skipped: 0, failed: 0 };

  for (const assetPath of assetPaths) {
    const result = await downloadAsset(assetPath);
    results[result.status === "ok" ? "ok" : result.status === "skipped" ? "skipped" : "failed"]++;
  }

  console.log(`\nDone: ${results.ok} downloaded, ${results.skipped} skipped, ${results.failed} failed`);
  if (results.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
