#!/usr/bin/env node
/**
 * Generate Supabase migration SQL for Catering Project catalogue import.
 *
 * Sources:
 *   refs/cateringproject/htmls/<category-slug>/products.json  (category groups + categories)
 *   refs/cateringproject/htmls/totalproducts.json               (products + multi-category links)
 *
 * Writes category_groups and categories first, then products (is_published = false),
 * then product_categories junction rows (one product may belong to many categories).
 *
 * Usage:
 *   node scripts/generate-cateringproject-migration.mjs
 *   node scripts/generate-cateringproject-migration.mjs --out supabase/migrations/20260705140000_cateringproject_products_bulk.sql
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML_ROOT = path.join(root, "refs/cateringproject/htmls");
const CATEGORIES_PATH = path.join(root, "refs/cateringproject/categories.json");
const TOTAL_PRODUCTS_PATH = path.join(HTML_ROOT, "totalproducts.json");
const DEFAULT_START_ID = 620001;
const DEFAULT_OUT = path.join(
  root,
  "supabase/migrations/20260705140000_cateringproject_products_bulk.sql",
);

const options = parseArgs(process.argv.slice(2));
const OUT_PATH = path.resolve(root, options.out);

function parseArgs(args) {
  const outArg = args.find((arg) => arg.startsWith("--out="));
  const startIdArg = args.find((arg) => arg.startsWith("--start-id="));
  return {
    out: outArg ? outArg.slice("--out=".length) : DEFAULT_OUT,
    startId: startIdArg ? Number(startIdArg.slice("--start-id=".length)) : DEFAULT_START_ID,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function listCategoryFolders() {
  return fs
    .readdirSync(HTML_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("."))
    .filter((name) => fs.existsSync(path.join(HTML_ROOT, name, "products.json")))
    .sort((a, b) => a.localeCompare(b));
}

function buildCatalogIndex(categoriesJson) {
  const groupByAlias = new Map();
  const categoryByFolder = new Map();
  const folderBySlugLower = new Map();

  for (const [groupIndex, group] of categoriesJson.entries()) {
    const groupAlias = `cp-${slugify(group.slug || group.categoryGroup)}`;
    if (!groupByAlias.has(groupAlias)) {
      groupByAlias.set(groupAlias, {
        alias: groupAlias,
        name: group.categoryGroup,
        sortOrder: groupIndex + 1,
        description: null,
      });
    }

    for (const [categoryIndex, category] of group.categories.entries()) {
      const folderSlug = category.slug;
      folderBySlugLower.set(folderSlug.toLowerCase(), folderSlug);
      categoryByFolder.set(folderSlug.toLowerCase(), {
        folderSlug,
        alias: folderSlug,
        name: category.name,
        groupAlias,
        groupName: group.categoryGroup,
        groupSortOrder: groupIndex + 1,
        sortOrder: categoryIndex + 1,
      });
    }
  }

  return { groupByAlias, categoryByFolder, folderBySlugLower };
}

function loadFolderCatalog(folderSlug, categoryByFolder) {
  const productsJsonPath = path.join(HTML_ROOT, folderSlug, "products.json");
  const payload = readJson(productsJsonPath);
  const meta = categoryByFolder.get(folderSlug.toLowerCase());

  const firstProduct = Array.isArray(payload.products) ? payload.products[0] : null;
  const imageUrl = firstProduct?.image_url ?? null;
  const description =
    typeof firstProduct?.description === "string"
      ? firstProduct.description.replace(/\s+/g, " ").trim().slice(0, 240)
      : null;

  return {
    folderSlug,
    alias: meta?.alias ?? folderSlug,
    name: payload.category || meta?.name || folderSlug,
    groupName: payload.category_group || meta?.groupName || "",
    groupAlias: meta?.groupAlias ?? `cp-${slugify(payload.category_group || "catering")}`,
    groupSortOrder: meta?.groupSortOrder ?? 999,
    sortOrder: meta?.sortOrder ?? 0,
    description,
    imageUrl,
    productCount: payload.count ?? payload.products?.length ?? 0,
  };
}

function buildCategories(folderSlugs, categoryByFolder, totalProducts) {
  const imageByFolder = new Map();

  for (const product of totalProducts) {
    const slugs = product._source?.category_slugs ?? [];
    const imageUrl = product.image_urls?.["1920"] ?? product.image_url ?? null;
    if (!imageUrl || !String(imageUrl).includes("/storage/v1/object/public/")) continue;

    for (const slug of slugs) {
      const key = slug.toLowerCase();
      if (!imageByFolder.has(key)) imageByFolder.set(key, imageUrl);
    }
  }

  return folderSlugs
    .map((folderSlug) => {
      const row = loadFolderCatalog(folderSlug, categoryByFolder);
      row.imageUrl = imageByFolder.get(folderSlug.toLowerCase()) ?? row.imageUrl;
      return row;
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.alias.localeCompare(b.alias));
}

function buildGroups(categories, groupByAlias) {
  const used = new Set(categories.map((category) => category.groupAlias));
  return [...groupByAlias.values()]
    .filter((group) => used.has(group.alias))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function categoryLabel(product) {
  const value = product.category;
  if (Array.isArray(value)) {
    return [...new Set(value.filter(Boolean))].join(", ");
  }
  return value ?? "";
}

function assignProductIds(products, startId) {
  let nextId = startId;
  return products.map((product) => {
    const id = nextId;
    nextId += 1;
    return { ...product, id };
  });
}

function buildProductCategoryLinks(products) {
  const links = [];

  for (const product of products) {
    const slugs = product._source?.category_slugs ?? [];
    if (!slugs.length) continue;

    const primarySlug =
      product._source?.image_category_slug ?? slugs[0];

    for (const [sortOrder, categorySlug] of slugs.entries()) {
      links.push({
        productId: product.id,
        categoryAlias: categorySlug,
        isPrimary: categorySlug === primarySlug,
        sortOrder,
      });
    }
  }

  return links;
}

function productRowSql(product) {
  const primarySlug =
    product._source?.image_category_slug ??
    product._source?.category_slugs?.[0] ??
    null;

  return `  (
    ${product.id},
    'catering'::public.product_type,
    ${sqlText(product.name)},
    ${sqlText(categoryLabel(product))},
    (select id from public.categories where alias = ${sqlText(primarySlug)}),
    ${sqlText(product.description ?? "")},
    ${sqlText(product.uom ?? "EACH")}::public.product_uom,
    ${sqlBool(product.is_available !== false)},
    false,
    ${Number(product.sort_order) || 0},
    ${sqlImageUrls(product.image_urls)},
    ${sqlText(product.price ?? "")},
    ${sqlNullableText(product.unit_price)},
    null,
    ${sqlJson(product.prices)},
    ${sqlText(product.product_slug ?? product.slug ?? "")},
    ${sqlBool(product.is_catch_weight)},
    '{}'::bigint[],
    ${sqlBool(product.is_popular)},
    ${sqlJson(product.ingredients)},
    ${sqlText(product.sku ?? `CT-${product.id}`)},
    ${sqlText(product.unit ?? "")},
    ${product.daily_global_limit ?? "null"},
    ${product.daily_customer_limit ?? "null"},
    ${Number(product.min_order_qty) || 1},
    ${sqlNullableText(product.serves)},
    ${sqlJson(product.includes)},
    ${sqlText(product.tag ?? "")},
    ${sqlText(product.tag_bg ?? "")},
    ${sqlNullableText(product.note)},
    ${sqlNullableText(product.image_url)},
    ${sqlBigintArray(product.customization_ids)},
    ${sqlBool(Boolean(product.customizations_disabled))},
    now(),
    now()
  )`;
}

function chunk(array, size) {
  const result = [];
  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }
  return result;
}

function generateSql({ groups, categories, products, productCategoryLinks, startId }) {
  const sections = [];

  sections.push(`-- Catering Project bulk import (unpublished)
-- Generated by scripts/generate-cateringproject-migration.mjs
-- Sources:
--   refs/cateringproject/htmls/*/products.json (${categories.length} categories)
--   refs/cateringproject/htmls/totalproducts.json (${products.length} products)
-- Product ids: ${startId}..${startId + products.length - 1}
`);

  if (groups.length) {
    sections.push(`insert into public.category_groups (
  kind,
  name,
  alias,
  sort_order,
  description
)
values
${groups
  .map(
    (group) => `  (
    'catering'::public.category_kind,
    ${sqlText(group.name)},
    ${sqlText(group.alias)},
    ${group.sortOrder},
    null
  )`,
  )
  .join(",\n")}
on conflict (alias) do update set
  kind = excluded.kind,
  name = excluded.name,
  sort_order = excluded.sort_order;`);
  }

  if (categories.length) {
    sections.push(`insert into public.categories (
  kind,
  alias,
  name,
  description,
  "imageUrl",
  addon,
  sort_order
)
values
${categories
  .map(
    (category) => `  (
    'catering'::public.category_kind,
    ${sqlText(category.alias)},
    ${sqlText(category.name)},
    ${sqlNullableText(category.description)},
    ${sqlNullableText(category.imageUrl)},
    '{}'::text[],
    ${category.sortOrder}
  )`,
  )
  .join(",\n")}
on conflict (alias) do update set
  kind = excluded.kind,
  name = excluded.name,
  description = excluded.description,
  "imageUrl" = coalesce(nullif(excluded."imageUrl", ''), categories."imageUrl"),
  sort_order = excluded.sort_order;`);

    sections.push(`with group_map (group_alias, category_alias) as (
  values
${categories
  .map((category) => `    (${sqlText(category.groupAlias)}, ${sqlText(category.alias)})`)
  .join(",\n")}
)
update public.categories c
set category_group_id = g.id
from group_map gm
join public.category_groups g on g.alias = gm.group_alias
where c.alias = gm.category_alias;`);
  }

  const productChunks = chunk(products, 40);
  for (const [index, productChunk] of productChunks.entries()) {
    sections.push(`insert into public.products (
  id,
  product_type,
  name,
  category,
  category_id,
  description,
  uom,
  is_available,
  is_published,
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
${productChunk.map((product) => productRowSql(product)).join(",\n")}
on conflict (id) do update set
  product_type = excluded.product_type,
  name = excluded.name,
  category = excluded.category,
  category_id = excluded.category_id,
  description = excluded.description,
  uom = excluded.uom,
  is_available = excluded.is_available,
  is_published = excluded.is_published,
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
  updated_at = now();${index < productChunks.length - 1 ? "" : ""}`);
  }

  const linkChunks = chunk(productCategoryLinks, 200);
  for (const linkChunk of linkChunks) {
    sections.push(`insert into public.product_categories (product_id, category_id, is_primary, sort_order)
select
  v.product_id,
  c.id,
  v.is_primary,
  v.sort_order
from (
  values
${linkChunk
  .map(
    (link) =>
      `    (${link.productId}::bigint, ${sqlText(link.categoryAlias)}, ${sqlBool(link.isPrimary)}, ${link.sortOrder})`,
  )
  .join(",\n")}
) as v(product_id, category_alias, is_primary, sort_order)
join public.categories c on c.alias = v.category_alias
on conflict (product_id, category_id) do update set
  is_primary = excluded.is_primary,
  sort_order = excluded.sort_order;`);
  }

  return `${sections.join("\n\n")}\n`;
}

function main() {
  const categoriesJson = readJson(CATEGORIES_PATH);
  const totalProducts = readJson(TOTAL_PRODUCTS_PATH);
  if (!Array.isArray(totalProducts)) {
    throw new Error(`${TOTAL_PRODUCTS_PATH} must be a JSON array`);
  }

  const { groupByAlias, categoryByFolder, folderBySlugLower } = buildCatalogIndex(categoriesJson);
  const folderSlugs = listCategoryFolders().map(
    (folder) => folderBySlugLower.get(folder.toLowerCase()) ?? folder,
  );
  const categories = buildCategories(folderSlugs, categoryByFolder, totalProducts);
  const groups = buildGroups(categories, groupByAlias);
  const products = assignProductIds(totalProducts, options.startId);
  const productCategoryLinks = buildProductCategoryLinks(products);
  const sql = generateSql({
    groups,
    categories,
    products,
    productCategoryLinks,
    startId: options.startId,
  });

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, sql);

  const multiCategoryProducts = products.filter(
    (product) => (product._source?.category_slugs?.length ?? 0) > 1,
  ).length;

  console.log(`Wrote ${path.relative(root, OUT_PATH)}`);
  console.log(
    JSON.stringify(
      {
        category_groups: groups.length,
        categories: categories.length,
        products: products.length,
        product_category_links: productCategoryLinks.length,
        multi_category_products: multiCategoryProducts,
        start_id: options.startId,
        end_id: options.startId + products.length - 1,
        bytes: sql.length,
      },
      null,
      2,
    ),
  );
}

main();
