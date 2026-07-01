#!/usr/bin/env node
/**
 * Generate Supabase migration SQL from refs/rssandwiches/*.json product drafts.
 *
 * Usage:
 *   node scripts/generate-rssandwiches-migration.mjs
 *   node scripts/generate-rssandwiches-migration.mjs --out supabase/migrations/20260702120000_rss_sandwiches_catering_bulk.sql
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REF_DIR = path.join(root, "refs/rssandwiches");
const DEFAULT_OUT = path.join(
  root,
  "supabase/migrations/20260702120000_rss_sandwiches_catering_bulk.sql",
);

const outArg = process.argv.find((a) => a.startsWith("--out="));
const OUT_PATH = outArg ? path.resolve(root, outArg.slice("--out=".length)) : DEFAULT_OUT;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

function sqlText(value) {
  if (value == null || value === "") return "''";
  return `'${sqlEscape(value)}'`;
}

function sqlNullableText(value) {
  if (value == null || value === "") return "null";
  return `'${sqlEscape(value)}'`;
}

function sqlJson(value) {
  return `'${sqlEscape(JSON.stringify(value ?? []))}'::jsonb`;
}

function sqlImageUrls(imageUrls) {
  if (!imageUrls || Object.keys(imageUrls).length === 0) return "'{}'::jsonb";
  return `'${sqlEscape(JSON.stringify(imageUrls))}'::jsonb`;
}

function sqlBool(value) {
  return value ? "true" : "false";
}

function sqlBigintArray(ids) {
  if (!ids?.length) return "array[]::bigint[]";
  return `array[${ids.join(", ")}]::bigint[]`;
}

const CATEGORY_ALIAS_OVERRIDES = {
  lunch: "lunch-catering-melbourne",
  breakfast: "breakfast-catering-melbourne",
};

const CATEGORY_DESCRIPTION_OVERRIDES = {
  "Lunch Catering Melbourne":
    "Sandwich, wrap and roll catering platters with tiered box pricing.",
};

function categoryAlias(name, collectionUrl) {
  const fromUrl = collectionUrl?.match(/\/collections\/([^/?#]+)/)?.[1];
  if (fromUrl && CATEGORY_ALIAS_OVERRIDES[fromUrl]) {
    return CATEGORY_ALIAS_OVERRIDES[fromUrl];
  }
  if (fromUrl) return fromUrl;
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadProducts() {
  return fs
    .readdirSync(REF_DIR)
    .filter((f) => f.endsWith(".json") && f !== "collection-product-links.json")
    .map((f) => readJson(path.join(REF_DIR, f)))
    .sort((a, b) => a.product.id - b.product.id);
}

function buildCategories(products) {
  const byName = new Map();
  for (const row of products) {
    const name = row.product.category;
    if (!name || byName.has(name)) continue;
    byName.set(name, {
      name,
      alias: categoryAlias(name, row.source?.collection),
      description:
        CATEGORY_DESCRIPTION_OVERRIDES[name] ??
        row.product.description?.slice(0, 200) ??
        "",
      imageUrl: row.product.image_url ?? row.product.image_urls?.["1920"] ?? "",
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildCustomizations(products) {
  const groups = new Map();
  const options = [];

  for (const row of products) {
    for (const group of row.product_customizations ?? []) {
      if (!groups.has(group.id)) {
        groups.set(group.id, group);
      }
      for (const opt of group.options ?? []) {
        options.push({
          customization_id: group.id,
          key: opt.key,
          title: opt.title,
          price: Number(opt.price) || 0,
          sort_order: opt.sort_order ?? 0,
        });
      }
    }
  }

  return {
    groups: [...groups.values()].sort((a, b) => a.id - b.id),
    options: options.sort(
      (a, b) =>
        a.customization_id - b.customization_id ||
        a.sort_order - b.sort_order ||
        a.key.localeCompare(b.key),
    ),
  };
}

function productRowSql(p) {
  const item = p.product;
  return `  (
    ${item.id},
    'catering'::public.product_type,
    ${sqlText(item.name)},
    ${sqlText(item.category)},
    ${sqlText(item.description ?? "")},
    'EACH'::public.product_uom,
    ${sqlBool(item.is_available !== false)},
    ${Number(item.sort_order) || 0},
    ${sqlImageUrls(item.image_urls)},
    ${sqlText(item.price ?? "")},
    ${sqlNullableText(item.unit_price)},
    null,
    ${sqlJson(item.prices)},
    ${sqlText(item.slug ?? "")},
    ${sqlBool(item.is_catch_weight)},
    '{}'::bigint[],
    ${sqlBool(item.is_popular)},
    ${sqlJson(item.ingredients)},
    ${sqlText(item.sku ?? "")},
    ${sqlText(item.unit ?? "")},
    ${item.daily_global_limit ?? "null"},
    ${item.daily_customer_limit ?? "null"},
    ${Number(item.min_order_qty) || 1},
    ${sqlNullableText(item.serves)},
    ${sqlJson(item.includes)},
    ${sqlText(item.tag ?? "")},
    ${sqlText(item.tag_bg ?? "")},
    ${sqlNullableText(item.note)},
    ${sqlNullableText(item.image_url)},
    ${sqlBigintArray(item.customization_ids)},
    ${sqlBool(Boolean(item.customizations_disabled))},
    now(),
    now()
  )`;
}

function generateSql(products) {
  const categories = buildCategories(products);
  const { groups, options } = buildCustomizations(products);

  const sections = [];

  sections.push(`-- R&S Sandwiches catering bulk import (includes gourmet-meat-sandwich sample, product 610081)
-- Generated by scripts/generate-rssandwiches-migration.mjs
-- Source: refs/rssandwiches/*.json (${products.length} products)
`);

  if (categories.length) {
    sections.push(`insert into public.categories (
  kind,
  alias,
  name,
  description,
  "imageUrl",
  addon
)
values
${categories
  .map(
    (cat) => `  (
    'catering'::public.category_kind,
    ${sqlText(cat.alias)},
    ${sqlText(cat.name)},
    ${sqlText(cat.description)},
    ${sqlNullableText(cat.imageUrl)},
    '{}'::text[]
  )`,
  )
  .join(",\n")}
on conflict (alias) do update set
  kind = excluded.kind,
  name = excluded.name,
  description = excluded.description,
  "imageUrl" = coalesce(nullif(excluded."imageUrl", ''), categories."imageUrl");`);
  }

  if (groups.length) {
    sections.push(`insert into public.product_customizations (
  id,
  kind,
  key,
  title,
  type,
  required,
  sort_order,
  is_multi_limited,
  min_options,
  max_options
)
overriding system value
values
${groups
  .map(
    (g) =>
      `  (${g.id}, 'catering', ${sqlText(g.key)}, ${sqlText(g.title)}, ${sqlText(g.type)}, ${sqlBool(g.required)}, ${Number(g.sort_order) || 0}, ${sqlBool(g.is_multi_limited)}, ${Number(g.min_options) || 0}, ${Number(g.max_options) || 0})`,
  )
  .join(",\n")}
on conflict (kind, key) do update set
  title = excluded.title,
  type = excluded.type,
  required = excluded.required,
  sort_order = excluded.sort_order,
  is_multi_limited = excluded.is_multi_limited,
  min_options = excluded.min_options,
  max_options = excluded.max_options;`);
  }

  if (options.length) {
    sections.push(`insert into public.product_customization_options (
  customization_id,
  key,
  title,
  price,
  sort_order
)
values
${options
  .map(
    (opt) =>
      `  (${opt.customization_id}, ${sqlText(opt.key)}, ${sqlText(opt.title)}, ${opt.price.toFixed(2)}, ${opt.sort_order})`,
  )
  .join(",\n")}
on conflict (customization_id, key) do update set
  title = excluded.title,
  price = excluded.price,
  sort_order = excluded.sort_order;`);
  }

  sections.push(`insert into public.products (
  id,
  product_type,
  name,
  category,
  description,
  uom,
  is_available,
  sort_order,
  image_urls,
  price,
  unit_price,
  wholesale_price,
  prices,
  slug,
  is_catch_weight,
  related_items,
  is_popular,
  ingredients,
  sku,
  unit,
  daily_global_limit,
  daily_customer_limit,
  min_order_qty,
  serves,
  includes,
  tag,
  tag_bg,
  note,
  image_url,
  customization_ids,
  customizations_disabled,
  created_at,
  updated_at
)
values
${products.map((p) => productRowSql(p)).join(",\n")}
on conflict (id) do update set
  product_type = excluded.product_type,
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  uom = excluded.uom,
  is_available = excluded.is_available,
  sort_order = excluded.sort_order,
  image_urls = excluded.image_urls,
  price = excluded.price,
  unit_price = excluded.unit_price,
  wholesale_price = excluded.wholesale_price,
  prices = excluded.prices,
  slug = excluded.slug,
  is_catch_weight = excluded.is_catch_weight,
  related_items = excluded.related_items,
  is_popular = excluded.is_popular,
  ingredients = excluded.ingredients,
  sku = coalesce(nullif(trim(products.sku), ''), excluded.sku),
  unit = excluded.unit,
  daily_global_limit = excluded.daily_global_limit,
  daily_customer_limit = excluded.daily_customer_limit,
  min_order_qty = excluded.min_order_qty,
  serves = excluded.serves,
  includes = excluded.includes,
  tag = excluded.tag,
  tag_bg = excluded.tag_bg,
  note = excluded.note,
  image_url = excluded.image_url,
  customization_ids = excluded.customization_ids,
  customizations_disabled = excluded.customizations_disabled,
  updated_at = now();`);

  sections.push(`select setval(
  pg_get_serial_sequence('public.product_customizations', 'id'),
  (select coalesce(max(id), 1) from public.product_customizations)
);`);

  return `${sections.join("\n\n")}\n`;
}

function main() {
  const products = loadProducts();
  const sql = generateSql(products);
  fs.writeFileSync(OUT_PATH, sql);

  const { groups } = buildCustomizations(products);
  console.log(`Wrote ${path.relative(root, OUT_PATH)}`);
  console.log(
    JSON.stringify(
      {
        products: products.length,
        categories: buildCategories(products).length,
        customizations: groups.length,
        options: buildCustomizations(products).options.length,
        bytes: sql.length,
      },
      null,
      2,
    ),
  );
}

main();
