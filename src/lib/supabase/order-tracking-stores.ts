import { getStoreLocations } from "@/lib/supabase/store-locations";
import {
  isPickupFulfillment,
  resolveTrackedOrderPickupStoreId,
  type TrackedOrder,
} from "@/lib/supabase/order-tracking";
import type { StoreLocation } from "@/types";

export type OrderTrackingStoreContext = {
  pickupStore: StoreLocation | null;
  invoiceCreatorStore: StoreLocation | null;
};

/** Resolve pickup + invoice-creator stores from cached SSR store locations. */
export async function resolveOrderTrackingStores(
  order: TrackedOrder,
): Promise<OrderTrackingStoreContext> {
  const stores = await getStoreLocations();

  let pickupStore: StoreLocation | null = null;
  if (isPickupFulfillment(order)) {
    const pickupStoreId = resolveTrackedOrderPickupStoreId(order);
    if (pickupStoreId != null) {
      pickupStore = stores.find((store) => store.id === pickupStoreId) ?? null;
    }
  }

  const invoiceCreatorStore =
    stores.find((store) => store.isInvoiceCreator) ?? null;

  return { pickupStore, invoiceCreatorStore };
}
