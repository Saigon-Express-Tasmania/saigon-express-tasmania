import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { mapMenuItemRow } from "@/types";
import type { MenuItem } from "@/contexts/CartContext";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { fetchAlacarteProductRows } from "./products";

const CACHE_TAG = CACHE_TAGS.menu;

async function loadMenuItems(): Promise<MenuItem[]> {
  const rows = await fetchAlacarteProductRows();
  return rows.map(mapMenuItemRow);
}

/**
 * Alacarte menu items for the public site, cached via Next.js unstable_cache.
 */
export const getMenuItems = unstable_cache(
  loadMenuItems,
  [CACHE_TAG, SERVER_CACHE_INSTANCE_ID],
  { revalidate: SHORT_REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);
