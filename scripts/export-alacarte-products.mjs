#!/usr/bin/env node
/**
 * Export all public.products rows with product_type = 'alacarte' to refs/alacarte-products.json.
 * Each product gets a full empty food_content object (all flags false) per FoodContent.ts.
 *
 * Usage:
 *   node scripts/export-alacarte-products.mjs
 *
 * Env (optional — loaded from .env / admin/.env if present):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "refs/alacarte-products.json");

const FOOD_CONTENT_KEYS = [
  "contains_pork",
  "contains_beef",
  "contains_chicken",
  "contains_duck",
  "contains_goat",
  "contains_game",
  "contains_turkey",
  "contains_lamb",
  "contains_shellfish",
  "contains_fish",
  "contains_crustaceans",
  "contains_molluscs",
  "contains_peanuts",
  "contains_tree_nuts",
  "contains_almonds",
  "contains_cashews",
  "contains_walnuts",
  "contains_soy",
  "contains_wheat",
  "contains_gluten",
  "contains_eggs",
  "contains_dairy",
  "contains_milk",
  "contains_cheese",
  "contains_sesame",
  "contains_mustard",
  "contains_celery",
  "contains_lupin",
  "contains_sulphites",
  "is_gluten_free",
  "is_dairy_free",
  "is_lactose_free",
  "is_vegan",
  "is_vegetarian",
  "is_halal",
  "is_kosher",
  "is_non_gmo",
  "is_organic",
  "is_sugar_free",
  "is_low_sodium",
  "is_keto_friendly",
  "is_spicy",
  "contains_alcohol",
  "contains_caffeine",
  "is_raw",
  "is_frozen",
  "is_ready_to_eat",
];

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

function emptyFoodContent() {
  return Object.fromEntries(FOOD_CONTENT_KEYS.map((key) => [key, false]));
}

function resolveSupabaseConfig() {
  for (const file of [".env", "admin/.env"]) {
    loadEnvFile(path.join(root, file));
  }

  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY (or NEXT_PUBLIC_/VITE_ variants).",
    );
  }

  return { url, key };
}

async function main() {
  const { url, key } = resolveSupabaseConfig();
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("product_type", "alacarte")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  const emptyFood = emptyFoodContent();
  const products = (data ?? []).map((row) => ({
    ...row,
    food_content: { ...emptyFood },
  }));

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");

  console.log(`Exported ${products.length} alacarte products to ${outPath}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
