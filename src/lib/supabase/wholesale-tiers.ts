import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import {
  mapWholesaleTierRow,
  type WholesalePricingTier,
  type WholesaleTierRow,
} from "@/types/WholesaleTier";
import { createServerSupabaseClient } from "./server";

const CACHE_TAG = CACHE_TAGS.wholesaleTiers;

async function loadWholesaleTiers(): Promise<WholesalePricingTier[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("wholesale_tiers")
    .select("id, label, min_units, discount, color, popular, sort_order")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) =>
    mapWholesaleTierRow(row as WholesaleTierRow),
  );
}

/**
 * Wholesale bulk-pricing tiers for the public wholesale shop page.
 */
export const getWholesaleTiers = unstable_cache(
  loadWholesaleTiers,
  [CACHE_TAG],
  { revalidate: SHORT_REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);
