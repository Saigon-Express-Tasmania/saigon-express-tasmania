import { unstable_cache } from "next/cache";
import type { StoreLocation } from "@/types";
import { mapStoreLocationRow } from "@/types";
import { fetchStoreLocationRows } from "./server";

const CACHE_TAG = "store-locations";
const REVALIDATE_SECONDS = 60 * 60; // 1 hour

async function loadStoreLocations(): Promise<StoreLocation[]> {
  const rows = await fetchStoreLocationRows();
  return rows.map(mapStoreLocationRow);
}

/**
 * Store locations for the public site, cached for at least one hour.
 */
export const getStoreLocations = unstable_cache(loadStoreLocations, [CACHE_TAG], {
  revalidate: REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});

