import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import type { StoreLocation } from "@/types";
import { mapStoreLocationRow } from "@/types";
import { fetchStoreLocationRows } from "./server";

const CACHE_TAG = CACHE_TAGS.storeLocations;

async function loadStoreLocations(): Promise<StoreLocation[]> {
  const rows = await fetchStoreLocationRows();
  return rows.map(mapStoreLocationRow);
}

/**
 * Store locations for the public site, cached for at least one hour.
 */
export const getStoreLocations = unstable_cache(
  loadStoreLocations,
  [CACHE_TAG],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  },
);

export const getActiveStoreLocations = () => {
  return getStoreLocations().then(locations => locations.filter(location => location.isActive));
}

export const getInvoiceCreatorStore = () => {
  return getStoreLocations().then(locations => locations.find(location => location.isInvoiceCreator));
}

export const getShippingOriginStoreLocation = () => {
  return getStoreLocations().then(
    (locations) => locations.find((location) => location.isShipping) ?? null,
  );
}
