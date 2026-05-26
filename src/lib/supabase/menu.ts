import { unstable_cache } from "next/cache";
import { mapMenuItemRow } from "@/types";
import type { MenuItem } from "@/contexts/CartContext";
import { fetchMenuItemRows } from "./server";

const CACHE_TAG = "menu";
const REVALIDATE_SECONDS = 60 * 60; // 1 hour

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
  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);
