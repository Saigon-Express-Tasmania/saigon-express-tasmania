import type { StoreLocation } from "@/types";

let cachedStoreLocations: StoreLocation[] = [];

/** Sync SSR-loaded store locations into a client-side module cache. */
export function setClientStoreLocations(stores: StoreLocation[]): void {
  cachedStoreLocations = stores;
}

export function getClientStoreLocations(): StoreLocation[] {
  return cachedStoreLocations;
}

export function findShippingOriginStore(
  stores: StoreLocation[] = cachedStoreLocations,
): StoreLocation | null {
  return stores.find((store) => store.isShipping) ?? null;
}

/** Stores shown in public UI (store finder, pickup selection). */
export function filterActiveStoreLocations(
  stores: StoreLocation[],
): StoreLocation[] {
  return stores.filter((store) => store.isActive);
}
