#!/usr/bin/env node
/**
 * Remove all product ↔ category links for a given category by deleting
 * public.product_categories rows. Products themselves are not deleted.
 *
 * Usage:
 *   node scripts/remove-category-product-links.mjs              # dry run, category 178
 *   node scripts/remove-category-product-links.mjs --apply      # delete links for 178
 *   node scripts/remove-category-product-links.mjs 42           # dry run, category 42
 *   node scripts/remove-category-product-links.mjs 42 --apply   # delete links for 42
 *
 * Env for --apply:
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CATEGORY_ID = 178;
const DELETE_BATCH_SIZE = 200;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const categoryArg = args.find((arg) => !arg.startsWith("--"));
const categoryId = Number(categoryArg ?? DEFAULT_CATEGORY_ID);

if (!Number.isInteger(categoryId) || categoryId <= 0) {
  console.error(`Invalid category id: ${categoryArg ?? DEFAULT_CATEGORY_ID}`);
  process.exit(1);
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

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadCategory(supabase, id) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, alias, kind")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function loadLinks(supabase, id) {
  const { data, error } = await supabase
    .from("product_categories")
    .select("product_id, category_id, is_primary, sort_order")
    .eq("category_id", id)
    .order("product_id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function main() {
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));

  const supabase = createSupabaseClient();
  const category = await loadCategory(supabase, categoryId);
  const links = await loadLinks(supabase, categoryId);

  const productIds = [...new Set(links.map((row) => Number(row.product_id)))];
  const primaryCount = links.filter((row) => row.is_primary).length;

  console.log(
    apply ? "Apply mode" : "Dry run",
  );
  console.log(`Category id: ${categoryId}`);
  if (category) {
    console.log(
      `Category: ${category.name} (${category.alias}, kind=${category.kind})`,
    );
  } else {
    console.log("Category: not found in public.categories");
  }
  console.log(`Product links to remove: ${links.length}`);
  console.log(`Distinct products affected: ${productIds.length}`);
  console.log(`Primary links among them: ${primaryCount}`);

  if (productIds.length > 0) {
    const preview = productIds.slice(0, 20);
    console.log(
      `Product ids${productIds.length > preview.length ? " (first 20)" : ""}: ${preview.join(", ")}`,
    );
    if (productIds.length > preview.length) {
      console.log(`…and ${productIds.length - preview.length} more`);
    }
  }

  if (!apply) {
    console.log("\nNo changes made. Re-run with --apply to delete these links.");
    return;
  }

  if (links.length === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  let deleted = 0;

  for (let offset = 0; offset < productIds.length; offset += DELETE_BATCH_SIZE) {
    const batchIds = productIds.slice(offset, offset + DELETE_BATCH_SIZE);
    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("category_id", categoryId)
      .in("product_id", batchIds);

    if (error) throw error;
    deleted += batchIds.length;
    console.log(`Deleted links for ${deleted}/${productIds.length} products…`);
  }

  const remaining = await loadLinks(supabase, categoryId);
  if (remaining.length > 0) {
    throw new Error(
      `Expected 0 remaining links for category ${categoryId}, found ${remaining.length}`,
    );
  }

  console.log(
    `\nDone. Removed ${links.length} product_categories row(s) for category ${categoryId}.`,
  );
  console.log(
    "Products were kept. Primary category mirrors on products.category_id are updated by DB trigger when needed.",
  );
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
