import { getStoreLocations } from "@/lib/supabase/store-locations";
import {
  isPickupFulfillment,
  resolveTrackedOrderPickupStoreId,
  type TrackedOrder,
} from "@/lib/supabase/order-tracking";
import type { StoreLocation } from "@/types";

export async function resolveTrackedOrderPickupStore(
  order: TrackedOrder,
): Promise<StoreLocation | null> {
  if (!isPickupFulfillment(order)) {
    return null;
  }

  const pickupStoreId = resolveTrackedOrderPickupStoreId(order);
  if (pickupStoreId == null) {
    return null;
  }

  const stores = await getStoreLocations();
  return stores.find((store) => store.id === pickupStoreId) ?? null;
}
