import { unstable_cache } from "next/cache";
import { CACHE_TAGS, REVALIDATE_SECONDS } from "@/config";
import { mapWholesaleProductRow, type WholesaleProduct } from "@/types";
import { fetchWholesaleProductRows } from "./server";

const CACHE_TAG = CACHE_TAGS.wholesaleProducts;

async function loadWholesaleProducts(): Promise<WholesaleProduct[]> {
  const rows = await fetchWholesaleProductRows();
  return rows.map(mapWholesaleProductRow);
}

/**
 * Wholesale products for the public wholesale shop, cached for at least one hour.
 */
export const getWholesaleProducts = unstable_cache(
  loadWholesaleProducts,
  [CACHE_TAG],
  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);

