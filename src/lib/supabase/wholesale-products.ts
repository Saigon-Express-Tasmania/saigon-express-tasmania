import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { mapWholesaleProductRow, type WholesaleProduct } from "@/types";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { fetchWholesaleProductRows } from "./products";

const CACHE_TAG = CACHE_TAGS.wholesaleProducts;

async function loadWholesaleProducts(): Promise<WholesaleProduct[]> {
  const rows = await fetchWholesaleProductRows();
  return rows.map(mapWholesaleProductRow);
}

/**
 * Wholesale products for the public wholesale shop, cached via Next.js unstable_cache.
 */
export const getWholesaleProducts = unstable_cache(
  loadWholesaleProducts,
  [CACHE_TAG, SERVER_CACHE_INSTANCE_ID],
  { revalidate: SHORT_REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);
