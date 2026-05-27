import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { mapPromotionRow, type Promotion } from "@/types";
import { fetchPromotionRows } from "./server";

const CACHE_TAG = CACHE_TAGS.promotions;

async function loadPromotions(): Promise<Promotion[]> {
  const rows = await fetchPromotionRows();
  return rows.map(mapPromotionRow);
}

/**
 * Promotions for the public site, cached for at least one hour.
 */
export const getPromotions = unstable_cache(loadPromotions, [CACHE_TAG], {
  revalidate: SHORT_REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});

