import type { DeliveryCity } from "@/types";
import {
  calculateSelfDeliveryFeeTotal,
  type SelfDeliveryFee,
} from "@/lib/self-delivery-fee";

export function buildDeliveryCityOptionKey(
  city: Pick<DeliveryCity, "name" | "postalCode">,
): string {
  return `${city.name}\u0000${city.postalCode}`;
}

export function formatDeliveryCityOptionLabel(
  city: Pick<DeliveryCity, "name" | "postalCode">,
): string {
  return `${city.name} (${formatDeliveryPostalCode(city.postalCode)})`;
}

export function formatDeliveryPostalCode(postalCode: number | string): string {
  return String(postalCode).padStart(4, "0");
}

export function findDeliveryCity(
  cities: DeliveryCity[],
  name: string,
  postalCode: string,
): DeliveryCity | null {
  const trimmedName = name.trim().toLowerCase();
  const trimmedPostal = postalCode.trim();
  if (!trimmedName && !trimmedPostal) return null;

  return (
    cities.find(
      (city) =>
        city.name.trim().toLowerCase() === trimmedName &&
        formatDeliveryPostalCode(city.postalCode) ===
          formatDeliveryPostalCode(trimmedPostal),
    ) ?? null
  );
}

export function sortDeliveryCities(cities: DeliveryCity[]): DeliveryCity[] {
  return [...cities].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );
}

export function resolveSelfDeliveryShippingFee(
  cityName: string,
  postalCode: string,
  deliveryCities: DeliveryCity[],
  selfDeliveryFee: SelfDeliveryFee,
): number {
  const city = findDeliveryCity(deliveryCities, cityName, postalCode);
  if (city?.distanceKm == null || !Number.isFinite(city.distanceKm)) {
    return 0;
  }

  return calculateSelfDeliveryFeeTotal(selfDeliveryFee, city.distanceKm);
}
