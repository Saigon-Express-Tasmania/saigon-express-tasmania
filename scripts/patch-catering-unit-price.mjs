#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "supabase/migrations/20260528162000_products.sql");

function parseCateringUnitPrice(price) {
  const trimmed = String(price ?? "").trim();
  if (!trimmed) return null;
  const withoutPrefix = trimmed.startsWith("$") ? trimmed.slice(1) : trimmed;
  const num = Number(withoutPrefix);
  if (!Number.isFinite(num) || Number.isNaN(num)) return null;
  return String(num);
}

let sql = fs.readFileSync(migrationPath, "utf8");
const start = sql.indexOf("-- Catering (Chao Catering import)");
const end = sql.indexOf("on conflict (id) do update set", start);
if (start < 0 || end < 0) {
  throw new Error("Catering section not found in products migration");
}

const before = sql.slice(0, start);
let section = sql.slice(start, end);
const after = sql.slice(end);

let count = 0;
section = section.replace(
  /\n    '(\$[^']*)',\n    '',/g,
  (match, priceLiteral) => {
    const unitPrice = parseCateringUnitPrice(priceLiteral);
    if (unitPrice == null) return match;
    count += 1;
    return `\n    '${priceLiteral}',\n    '${unitPrice}',`;
  },
);

fs.writeFileSync(migrationPath, before + section + after);
console.log(`Updated ${count} catering unit_price values in migration`);
