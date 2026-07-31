import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { ENV } from "@/config/env";
import type {
  ProductCategoriesByProductId,
  ProductCategoryAssignment,
} from "@/lib/product-categories";
import type { MenuItemRow, WholesaleProductRow } from "@/types";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "./server";

export type ProductType = "alacarte" | "wholesale" | "catering";

export type AvailableProductsPageQuery = {
  categoryId: number;
  page: number;
  pageSize: number;
  search?: string;
};

export type ProductCategoryAssignmentEntry = {
  productId: number;
  assignments: ProductCategoryAssignment[];
};

/** Serializable shape stored in Next.js data cache. */
type CachedAvailableProductsPageResult<T> = {
  rows: T[];
  totalCount: number;
  categoryAssignments: ProductCategoryAssignmentEntry[];
};

export type AvailableProductsPageResult<T> = {
  rows: T[];
  totalCount: number;
  categoriesByProductId: ProductCategoriesByProductId;
};

function hydrateAvailableProductsPageResult<T>(
  cached: CachedAvailableProductsPageResult<T>,
): AvailableProductsPageResult<T> {
  const categoriesByProductId: ProductCategoriesByProductId = new Map();
  for (const entry of cached.categoryAssignments) {
    categoriesByProductId.set(entry.productId, entry.assignments);
  }
  return {
    rows: cached.rows,
    totalCount: cached.totalCount,
    categoriesByProductId,
  };
}

const ALACARTE_SELECT =
  "id, name, slug, description, price, wholesale_price, image_urls, is_available, is_popular, sort_order, ingredients, energy, food_content, customization_ids, customizations_disabled";

const WHOLESALE_SELECT =
  "id, name, sku, description, unit, unit_price, daily_global_limit, daily_customer_limit, is_available, min_order_qty, sort_order, image_urls, created_at, updated_at";

export const CATERING_SELECT =
  "id, name, serves, price, unit_price, description, includes, note, prices, tag, tag_bg, image_url, image_urls, sort_order, is_available, customization_ids, customizations_disabled";

const PRODUCT_CACHE_TAGS: Record<ProductType, string> = {
  alacarte: CACHE_TAGS.menu,
  wholesale: CACHE_TAGS.wholesaleProducts,
  catering: CACHE_TAGS.cateringPacks,
};

function publishedProductsCacheKey(): string {
  return ENV.useUnpublishedProducts ? "include-unpublished" : "published-only";
}

function applyPublishedProductFilter<
  T extends { eq: (column: string, value: boolean) => T },
>(query: T): T {
  if (ENV.useUnpublishedProducts) return query;
  return query.eq("is_published", true);
}

async function queryAvailableProductRows<T>(
  productType: ProductType,
  select: string,
  order: { column: string; ascending: boolean }[],
): Promise<T[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("products")
    .select(select)
    .eq("product_type", productType)
    .eq("is_available", true);

  query = applyPublishedProductFilter(query);

  for (const { column, ascending } of order) {
    query = query.order(column, { ascending });
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`products (${productType}): ${error.message}`);
  }

  return (data ?? []) as T[];
}

function getCachedAvailableProductRows<T>(
  productType: ProductType,
  select: string,
  order: { column: string; ascending: boolean }[],
): Promise<T[]> {
  const orderKey = order
    .map(({ column, ascending }) => `${column}:${ascending ? "asc" : "desc"}`)
    .join(",");

  return unstable_cache(
    () => queryAvailableProductRows<T>(productType, select, order),
    [
      "products",
      "available-list",
      productType,
      select,
      orderKey,
      publishedProductsCacheKey(),
    ],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [PRODUCT_CACHE_TAGS[productType]],
    },
  )();
}

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function extractPageRowsWithCategories<T>(
  data: unknown[],
): CachedAvailableProductsPageResult<T> {
  const categoryAssignments: ProductCategoryAssignmentEntry[] = [];
  const rows: T[] = [];

  for (const raw of data) {
    const row = raw as Record<string, unknown>;
    const productId = Number(row.id);
    const embeds = row.product_categories;
    const assignments: ProductCategoryAssignment[] = [];

    if (Array.isArray(embeds)) {
      for (const embed of embeds) {
        const entry = embed as {
          category_id?: number | string;
          is_primary?: boolean;
          sort_order?: number | string | null;
        };
        assignments.push({
          categoryId: Number(entry.category_id),
          isPrimary: Boolean(entry.is_primary),
          sortOrder: Number(entry.sort_order ?? 0),
        });
      }
    }

    categoryAssignments.push({ productId, assignments });
    const { product_categories, ...rest } = row;
    void product_categories;
    rows.push(rest as T);
  }

  return { rows, totalCount: rows.length, categoryAssignments };
}

async function queryAvailableProductsPage<T extends Record<string, unknown>>(
  productType: ProductType,
  select: string,
  order: { column: string; ascending: boolean }[],
  pageQuery: AvailableProductsPageQuery,
): Promise<CachedAvailableProductsPageResult<T>> {
  const page = Math.max(1, pageQuery.page);
  const pageSize = Math.max(1, pageQuery.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServerSupabaseClient();
  const selectWithCategory =
    `${select}, product_categories!inner(category_id, is_primary, sort_order)` as "*";
  let query = supabase
    .from("products")
    .select(selectWithCategory, {
      count: "exact",
    })
    .eq("product_type", productType)
    .eq("is_available", true)
    .eq("product_categories.category_id", pageQuery.categoryId);

  query = applyPublishedProductFilter(query);

  const search = pageQuery.search?.trim();
  if (search) {
    const pattern = `%${escapeIlikePattern(search)}%`;
    query = query.or(
      `name.ilike."${pattern.replace(/"/g, '\\"')}",description.ilike."${pattern.replace(/"/g, '\\"')}"`,
    );
  }

  for (const { column, ascending } of order) {
    query = query.order(column, { ascending });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(
      `products page (${productType}, category ${pageQuery.categoryId}): ${error.message}`,
    );
  }

  const extracted = extractPageRowsWithCategories<T>(
    (data ?? []) as unknown[],
  );

  return {
    ...extracted,
    totalCount: count ?? extracted.rows.length,
  };
}

function getCachedAvailableProductsPage<T extends Record<string, unknown>>(
  productType: ProductType,
  select: string,
  order: { column: string; ascending: boolean }[],
  pageQuery: AvailableProductsPageQuery,
): Promise<AvailableProductsPageResult<T>> {
  const orderKey = order
    .map(({ column, ascending }) => `${column}:${ascending ? "asc" : "desc"}`)
    .join(",");
  const searchKey = pageQuery.search?.trim() ?? "";

  return unstable_cache(
    () =>
      queryAvailableProductsPage<T>(productType, select, order, pageQuery),
    [
      "products",
      "available-page",
      productType,
      select,
      orderKey,
      String(pageQuery.categoryId),
      String(pageQuery.page),
      String(pageQuery.pageSize),
      searchKey,
      publishedProductsCacheKey(),
      "with-category-embed-v2",
    ],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [PRODUCT_CACHE_TAGS[productType]],
    },
  )().then(hydrateAvailableProductsPageResult);
}

async function queryAlacarteProductRowById(
  id: number,
): Promise<MenuItemRow | null> {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("products")
    .select(ALACARTE_SELECT)
    .eq("product_type", "alacarte")
    .eq("id", id);

  query = applyPublishedProductFilter(query);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`products alacarte item ${id}: ${error.message}`);
  }

  return (data as MenuItemRow | null) ?? null;
}

async function queryAlacarteProductRowBySlug(
  slug: string,
): Promise<MenuItemRow | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("products")
    .select(ALACARTE_SELECT)
    .eq("product_type", "alacarte")
    .eq("slug", trimmed);

  query = applyPublishedProductFilter(query);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`products alacarte slug "${trimmed}": ${error.message}`);
  }

  return (data as MenuItemRow | null) ?? null;
}

export async function fetchAlacarteProductRows(): Promise<MenuItemRow[]> {
  return getCachedAvailableProductRows<MenuItemRow>("alacarte", ALACARTE_SELECT, [
    { column: "sort_order", ascending: true },
    { column: "id", ascending: true },
  ]);
}

const ALACARTE_ORDER = [
  { column: "sort_order", ascending: true },
  { column: "id", ascending: true },
] as const;

const WHOLESALE_ORDER = [
  { column: "sort_order", ascending: true },
  { column: "id", ascending: true },
] as const;

const CATERING_ORDER = [
  { column: "sort_order", ascending: true },
  { column: "id", ascending: true },
] as const;

export async function fetchAlacarteProductsPage(
  pageQuery: AvailableProductsPageQuery,
): Promise<AvailableProductsPageResult<MenuItemRow>> {
  return getCachedAvailableProductsPage<MenuItemRow & Record<string, unknown>>(
    "alacarte",
    ALACARTE_SELECT,
    [...ALACARTE_ORDER],
    pageQuery,
  ) as Promise<AvailableProductsPageResult<MenuItemRow>>;
}

export async function fetchAlacarteProductRowById(
  id: number,
): Promise<MenuItemRow | null> {
  return unstable_cache(
    () => queryAlacarteProductRowById(id),
    ["products", "alacarte", "id", String(id), publishedProductsCacheKey()],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [CACHE_TAGS.menu, `${CACHE_TAGS.menu}-item-${id}`],
    },
  )();
}

export async function fetchAlacarteProductRowBySlug(
  slug: string,
): Promise<MenuItemRow | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  return unstable_cache(
    () => queryAlacarteProductRowBySlug(trimmed),
    ["products", "alacarte", "slug", trimmed, publishedProductsCacheKey()],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [CACHE_TAGS.menu, `${CACHE_TAGS.menu}-slug-${trimmed}`],
    },
  )();
}

export async function fetchWholesaleProductRows(): Promise<WholesaleProductRow[]> {
  return getCachedAvailableProductRows<WholesaleProductRow>(
    "wholesale",
    WHOLESALE_SELECT,
    [
      { column: "sort_order", ascending: true },
      { column: "id", ascending: true },
    ],
  );
}

export async function fetchWholesaleProductsPage(
  pageQuery: AvailableProductsPageQuery,
): Promise<AvailableProductsPageResult<WholesaleProductRow>> {
  return getCachedAvailableProductsPage<
    WholesaleProductRow & Record<string, unknown>
  >("wholesale", WHOLESALE_SELECT, [...WHOLESALE_ORDER], pageQuery) as Promise<
    AvailableProductsPageResult<WholesaleProductRow>
  >;
}

export type CateringProductRow = {
  id: number;
  name: string;
  serves: string | null;
  price: string | null;
  unit_price: string | null;
  description: string;
  includes: string[] | null;
  note: string | null;
  prices: unknown;
  tag: string;
  tag_bg: string;
  image_url: string | null;
  image_urls: Record<string, unknown> | null;
  sort_order: number;
  is_available: boolean;
  customization_ids: number[] | null;
  customizations_disabled: boolean | null;
};

async function queryCateringProductRowById(
  id: number,
): Promise<CateringProductRow | null> {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("products")
    .select(CATERING_SELECT)
    .eq("product_type", "catering")
    .eq("id", id);

  query = applyPublishedProductFilter(query);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`products catering item ${id}: ${error.message}`);
  }

  return (data as CateringProductRow | null) ?? null;
}

export async function fetchCateringProductRowById(
  id: number,
): Promise<CateringProductRow | null> {
  return unstable_cache(
    () => queryCateringProductRowById(id),
    ["products", "catering", "id", String(id), publishedProductsCacheKey()],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [CACHE_TAGS.cateringPacks, `${CACHE_TAGS.cateringPacks}-item-${id}`],
    },
  )();
}

export async function fetchCateringProductRows(): Promise<CateringProductRow[]> {
  return getCachedAvailableProductRows<CateringProductRow>(
    "catering",
    CATERING_SELECT,
    [
      { column: "sort_order", ascending: true },
      { column: "id", ascending: true },
    ],
  );
}

export async function fetchCateringProductsPage(
  pageQuery: AvailableProductsPageQuery,
): Promise<AvailableProductsPageResult<CateringProductRow>> {
  return getCachedAvailableProductsPage<
    CateringProductRow & Record<string, unknown>
  >("catering", CATERING_SELECT, [...CATERING_ORDER], pageQuery) as Promise<
    AvailableProductsPageResult<CateringProductRow>
  >;
}

/** @deprecated Use fetchAlacarteProductRows */
export const fetchMenuItemRows = fetchAlacarteProductRows;

/** @deprecated Use fetchAlacarteProductRowById */
export const fetchMenuItemRowById = fetchAlacarteProductRowById;

/** @deprecated Use fetchAlacarteProductRowBySlug */
export const fetchMenuItemRowBySlug = fetchAlacarteProductRowBySlug;
