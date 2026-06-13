import { resolveOrderTrackingStores } from "@/lib/supabase/order-tracking-stores";
import type { TrackedOrder } from "@/lib/supabase/order-tracking";
import type { StoreLocation } from "@/types";

/** @deprecated Use resolveOrderTrackingStores instead. */
export async function resolveTrackedOrderPickupStore(
  order: TrackedOrder,
): Promise<StoreLocation | null> {
  const { pickupStore } = await resolveOrderTrackingStores(order);
  return pickupStore;
}
