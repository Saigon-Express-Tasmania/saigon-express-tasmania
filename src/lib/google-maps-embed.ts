import type { TrackedOrder } from "@/lib/supabase/order-tracking";
import { isPickupFulfillment } from "@/lib/supabase/order-tracking";
import {
  formatFlatShippingLines,
  formatWholesaleStreetAddress,
  hasMeaningfulFlatShippingAddress,
} from "@/lib/wholesale-b2b-order";
import type { StoreLocation } from "@/types";

export function buildGoogleMapsEmbedUrl(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&z=15&output=embed`;
}

export function resolvePickupStoreMapEmbedUrl(
  store: StoreLocation,
): string | null {
  const embedUrl = store.googleMapUrl?.trim();
  if (embedUrl) return embedUrl;

  const query = [store.address, store.suburb].filter(Boolean).join(", ");
  return buildGoogleMapsEmbedUrl(query);
}

export function resolveOrderTrackingMapEmbedUrl(
  order: TrackedOrder,
  pickupStore: StoreLocation | null,
): string | null {
  if (isPickupFulfillment(order)) {
    return pickupStore ? resolvePickupStoreMapEmbedUrl(pickupStore) : null;
  }

  if (hasMeaningfulFlatShippingAddress(order.address)) {
    return buildGoogleMapsEmbedUrl(
      formatFlatShippingLines(order.address).join(", "),
    );
  }

  if (order.b2b.shippingAddress) {
    return buildGoogleMapsEmbedUrl(
      formatWholesaleStreetAddress(order.b2b.shippingAddress).join(", "),
    );
  }

  return null;
}
