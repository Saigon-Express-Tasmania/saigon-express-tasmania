import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { parseNumericMenuItemId } from "@/lib/menu-item-routes";
import { mapMenuItemRow } from "@/types";
import type { MenuItem } from "@/contexts/CartContext";
import {
  categoryMapById,
  resolveCategoryName,
} from "@/lib/product-category";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { getCategoriesByKind } from "./categories";
import { fetchAlacarteProductRowById, fetchAlacarteProductRowBySlug } from "./products";

const CACHE_TAG = CACHE_TAGS.menu;

async function loadMenuItemById(id: number): Promise<MenuItem | null> {
  const [row, categories] = await Promise.all([
    fetchAlacarteProductRowById(id),
    getCategoriesByKind("menu"),
  ]);
  if (!row) return null;
  const categoryById = categoryMapById(categories);
  return mapMenuItemRow(
    row,
    resolveCategoryName(row.category_id, categoryById, row.category ?? ""),
  );
}

async function loadMenuItemBySlug(slug: string): Promise<MenuItem | null> {
  const [row, categories] = await Promise.all([
    fetchAlacarteProductRowBySlug(slug),
    getCategoriesByKind("menu"),
  ]);
  if (!row) return null;
  const categoryById = categoryMapById(categories);
  return mapMenuItemRow(
    row,
    resolveCategoryName(row.category_id, categoryById, row.category ?? ""),
  );
}

/**
 * Single menu item by id, cached with the menu tag family.
 */
export function getMenuItemById(id: number): Promise<MenuItem | null> {
  return unstable_cache(
    () => loadMenuItemById(id),
    [CACHE_TAG, "menu-item", SERVER_CACHE_INSTANCE_ID, "id", String(id)],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [CACHE_TAG, `${CACHE_TAG}-item-${id}`],
    },
  )();
}

/**
 * Single menu item by slug, cached with the menu tag family.
 */
export function getMenuItemBySlug(slug: string): Promise<MenuItem | null> {
  const normalized = slug.trim();
  return unstable_cache(
    () => loadMenuItemBySlug(normalized),
    [CACHE_TAG, "menu-item", SERVER_CACHE_INSTANCE_ID, "slug", normalized],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [CACHE_TAG, `${CACHE_TAG}-slug-${normalized}`],
    },
  )();
}

/**
 * Resolve a menu item from a route param (numeric id or slug).
 */
export function getMenuItemFromParam(param: string): Promise<MenuItem | null> {
  const id = parseNumericMenuItemId(param);
  if (id !== null) return getMenuItemById(id);
  return getMenuItemBySlug(decodeURIComponent(param));
}
