import {
  DEFAULT_AUSTRALIAN_STATE_CODE,
  type AustralianStateCode,
} from "@/types/WholesaleB2BOrder";

export const BILLING_COUNTRY_SUGGESTIONS = ["Australia"] as const;

const AUSTRALIAN_STATE_CODES: readonly AustralianStateCode[] = [
  "ACT",
  "NSW",
  "NT",
  "QLD",
  "SA",
  "TAS",
  "VIC",
  "WA",
];

export function isBillingCountryAustralia(country: string): boolean {
  const normalized = country.trim().toLowerCase();
  return normalized === "australia" || normalized === "au";
}

export function normalizeBillingStateForAustralia(state: string): string {
  const trimmed = state.trim();
  if (AUSTRALIAN_STATE_CODES.includes(trimmed as AustralianStateCode)) {
    return trimmed;
  }
  return DEFAULT_AUSTRALIAN_STATE_CODE;
}

export function billingCountryPatch(
  country: string,
  currentState: string,
): { billing_country: string; billing_state?: string } {
  const billing_country = country;
  if (isBillingCountryAustralia(country)) {
    return {
      billing_country,
      billing_state: normalizeBillingStateForAustralia(currentState),
    };
  }
  return { billing_country };
}
