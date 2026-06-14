import {
  mapWholesaleTierRow,
  type WholesalePricingTier,
  type WholesaleTierRow,
} from "@/types/WholesaleTier";
import { createServerSupabaseClient } from "./server";

let tiersPromise: Promise<WholesalePricingTier[]> | null = null;

async function fetchWholesaleTiers(): Promise<WholesalePricingTier[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("wholesale_tiers")
    .select("id, label, min_value, discount_value, color, popular, sort_order")
    .gt("min_value", 0)
    .gt("discount_value", 0)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) =>
    mapWholesaleTierRow(row as WholesaleTierRow),
  );
}

/**
 * Wholesale bulk-pricing tiers for the public wholesale shop page.
 * Cached in process memory for the lifetime of the server; refetched after each restart/deploy.
 */
export function getWholesaleTiers(): Promise<WholesalePricingTier[]> {
  if (!tiersPromise) {
    tiersPromise = fetchWholesaleTiers().catch((error) => {
      tiersPromise = null;
      throw error;
    });
  }
  return tiersPromise;
}
