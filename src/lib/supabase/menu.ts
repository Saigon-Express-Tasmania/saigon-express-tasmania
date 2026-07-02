import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { mapMenuItemRow } from "@/types";
import type { MenuItem } from "@/contexts/CartContext";
import {
  categoryMapById,
  resolveCategoryName,
} from "@/lib/product-category";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { getCategoriesByKind } from "./categories";
import { fetchAlacarteProductRows } from "./products";

const CACHE_TAG = CACHE_TAGS.menu;

async function loadMenuItems(): Promise<MenuItem[]> {
  const [rows, categories] = await Promise.all([
    fetchAlacarteProductRows(),
    getCategoriesByKind("menu"),
  ]);
  const categoryById = categoryMapById(categories);
  return rows.map((row) =>
    mapMenuItemRow(
      row,
      resolveCategoryName(row.category_id, categoryById, row.category ?? ""),
    ),
  );
}

/**
 * Alacarte menu items for the public site, cached via Next.js unstable_cache.
 */
export const getMenuItems = unstable_cache(
  loadMenuItems,
  [CACHE_TAG, SERVER_CACHE_INSTANCE_ID],
  { revalidate: SHORT_REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);
