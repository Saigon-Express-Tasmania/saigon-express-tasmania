import type { createServiceClient } from "./supabase.ts";
import {
  calculateSelfDeliveryFeeTotal,
  parseSelfDeliveryFee,
  SELF_DELIVERY_FEE_KEY,
  type SelfDeliveryFee,
} from "./self-delivery-fee.ts";

export async function fetchSelfDeliveryFeeSettings(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<SelfDeliveryFee> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", SELF_DELIVERY_FEE_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load self delivery fee settings: ${error.message}`,
    );
  }

  return parseSelfDeliveryFee(data?.value);
}

export async function fetchDeliveryCityDistanceKm(
  supabase: ReturnType<typeof createServiceClient>,
  city: string,
  postalCode: string,
): Promise<number | null> {
  const trimmedCity = city.trim();
  const trimmedPostal = postalCode.trim();
  if (!trimmedCity || !trimmedPostal) return null;

  const postal = Number.parseInt(trimmedPostal, 10);
  if (!Number.isFinite(postal)) return null;

  const { data, error } = await supabase
    .from("delivery_cities")
    .select("my_distance")
    .ilike("name", trimmedCity)
    .eq("postal_code", postal)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load delivery city distance: ${error.message}`);
  }

  if (data?.my_distance == null) return null;

  const distance = Number.parseFloat(String(data.my_distance));
  return Number.isFinite(distance) ? distance : null;
}

export async function resolveCateringShippingFee(
  supabase: ReturnType<typeof createServiceClient>,
  city: string,
  postalCode: string,
): Promise<number> {
  const [feeSettings, distanceKm] = await Promise.all([
    fetchSelfDeliveryFeeSettings(supabase),
    fetchDeliveryCityDistanceKm(supabase, city, postalCode),
  ]);

  if (distanceKm == null) return 0;
  return calculateSelfDeliveryFeeTotal(feeSettings, distanceKm);
}

const SHIPPING_FEE_TOLERANCE = 0.1;

export function assertCateringShippingFeeMatches(
  submittedShippingFee: number,
  expectedShippingFee: number,
): void {
  if (
    !Number.isFinite(submittedShippingFee) ||
    Math.abs(submittedShippingFee - expectedShippingFee) >
      SHIPPING_FEE_TOLERANCE
  ) {
    throw new Error(
      "Delivery fee has changed. Please review your order and try again.",
    );
  }
}
