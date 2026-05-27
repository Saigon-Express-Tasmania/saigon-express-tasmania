import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { mapMenuItemRow } from "@/types";
import type { MenuItem } from "@/contexts/CartContext";
import { fetchMenuItemRows } from "./server";

const CACHE_TAG = CACHE_TAGS.menu;

async function loadMenuItems(): Promise<MenuItem[]> {
  const rows = await fetchMenuItemRows();
  return rows.map(mapMenuItemRow);
}

/**
 * Menu items for the public site, cached for at least one hour.
 */
export const getMenuItems = unstable_cache(
  loadMenuItems,
  [CACHE_TAG],
  { revalidate: SHORT_REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);
