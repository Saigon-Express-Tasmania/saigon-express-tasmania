import { unstable_cache } from "next/cache";
import { mapPromotionRow, type Promotion } from "@/types";
import { fetchPromotionRows } from "./server";

const CACHE_TAG = "promotions";
const REVALIDATE_SECONDS = 60 * 60; // 1 hour

async function loadPromotions(): Promise<Promotion[]> {
  const rows = await fetchPromotionRows();
  return rows.map(mapPromotionRow);
}

/**
 * Promotions for the public site, cached for at least one hour.
 */
export const getPromotions = unstable_cache(loadPromotions, [CACHE_TAG], {
  revalidate: REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});

