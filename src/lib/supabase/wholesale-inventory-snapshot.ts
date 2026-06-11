import "server-only";

import { unstable_cache } from "next/cache";
import {
  CACHE_TAGS,
  WHOLESALE_INVENTORY_REVALIDATE_SECONDS,
} from "@/config";
import type { WholesaleProductAvailabilityRow } from "@/types";
import { fetchWholesaleProductsAvailability } from "./wholesale-availability";

const CACHE_TAG = CACHE_TAGS.wholesaleInventory;

async function loadWholesaleInventorySnapshot(): Promise<
  WholesaleProductAvailabilityRow[]
> {
  return fetchWholesaleProductsAvailability(null);
}

export const getWholesaleInventorySnapshot = unstable_cache(
  loadWholesaleInventorySnapshot,
  [CACHE_TAG],
  {
    revalidate: WHOLESALE_INVENTORY_REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  },
);
