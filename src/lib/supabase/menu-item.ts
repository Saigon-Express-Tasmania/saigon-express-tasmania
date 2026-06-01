import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { mapMenuItemRow } from "@/types";
import type { MenuItem } from "@/contexts/CartContext";
import { fetchMenuItemRowById } from "./server";

const CACHE_TAG = CACHE_TAGS.menu;

async function loadMenuItemById(id: number): Promise<MenuItem | null> {
  const row = await fetchMenuItemRowById(id);
  return row ? mapMenuItemRow(row) : null;
}

/**
 * Single menu item by id, cached with the menu tag family.
 */
export function getMenuItemById(id: number): Promise<MenuItem | null> {
  return unstable_cache(
    () => loadMenuItemById(id),
    [CACHE_TAG, "menu-item", String(id)],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [CACHE_TAG, `${CACHE_TAG}-item-${id}`],
    },
  )();
}
