import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import type { MenuItemRow, WholesaleProductRow } from "@/types";
import { unstable_cache } from "next/cache";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { createServerSupabaseClient } from "./server";

export type ProductType = "alacarte" | "wholesale" | "catering";

const ALACARTE_SELECT =
  "id, name, slug, description, price, wholesale_price, category, image_urls, is_available, is_popular, sort_order, ingredients, energy, food_content";

const WHOLESALE_SELECT =
  "id, name, sku, category, description, unit, unit_price, daily_global_limit, daily_customer_limit, is_available, min_order_qty, image_urls, created_at, updated_at";

export const CATERING_SELECT =
  "id, name, category, serves, price, description, includes, note, prices, tag, tag_bg, image_url, image_urls, sort_order, is_available";

const PRODUCT_CACHE_TAGS: Record<ProductType, string> = {
  alacarte: CACHE_TAGS.menu,
  wholesale: CACHE_TAGS.wholesaleProducts,
  catering: CACHE_TAGS.cateringPacks,
};

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
      SERVER_CACHE_INSTANCE_ID,
    ],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [PRODUCT_CACHE_TAGS[productType]],
    },
  )();
}

async function queryAlacarteProductRowById(
  id: number,
): Promise<MenuItemRow | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(ALACARTE_SELECT)
    .eq("product_type", "alacarte")
    .eq("id", id)
    .maybeSingle();

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
  const { data, error } = await supabase
    .from("products")
    .select(ALACARTE_SELECT)
    .eq("product_type", "alacarte")
    .eq("slug", trimmed)
    .maybeSingle();

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

export async function fetchAlacarteProductRowById(
  id: number,
): Promise<MenuItemRow | null> {
  return unstable_cache(
    () => queryAlacarteProductRowById(id),
    ["products", "alacarte", "id", String(id), SERVER_CACHE_INSTANCE_ID],
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
    ["products", "alacarte", "slug", trimmed, SERVER_CACHE_INSTANCE_ID],
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
      { column: "category", ascending: true },
      { column: "id", ascending: true },
    ],
  );
}

export type CateringProductRow = {
  id: number;
  name: string;
  category: string;
  serves: string | null;
  price: string | null;
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
};

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

/** @deprecated Use fetchAlacarteProductRows */
export const fetchMenuItemRows = fetchAlacarteProductRows;

/** @deprecated Use fetchAlacarteProductRowById */
export const fetchMenuItemRowById = fetchAlacarteProductRowById;

/** @deprecated Use fetchAlacarteProductRowBySlug */
export const fetchMenuItemRowBySlug = fetchAlacarteProductRowBySlug;
