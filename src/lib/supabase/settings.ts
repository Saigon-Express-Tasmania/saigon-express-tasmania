import { unstable_cache } from "next/cache";
import {
  CACHE_TAGS,
  DEFAULT_MINIMUM_WHOLESALE_ORDER_VALUE,
  SHORT_REVALIDATE_SECONDS,
} from "@/config";
import { parseGstTaxRate, parseIsGstInclusive, resolveCommerceTaxSettings } from "@/lib/gst";
import { createServerSupabaseClient } from "./server";

const CACHE_TAG = CACHE_TAGS.settings;

async function loadSettings(): Promise<Record<string, string>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("settings").select("key, value");

  if (error) {
    throw new Error(`settings: ${error.message}`);
  }

  return (data ?? []).reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export const getSettings = unstable_cache(loadSettings, [CACHE_TAG], {
  revalidate: SHORT_REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});

export function getMinimumWholesaleOrderValue(
  settings: Record<string, string>,
): number {
  const raw = settings.minimum_wholesale_order_value?.trim();
  if (!raw) return DEFAULT_MINIMUM_WHOLESALE_ORDER_VALUE;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MINIMUM_WHOLESALE_ORDER_VALUE;
  }

  return parsed;
}

export function getGstTaxRate(settings: Record<string, string>): number {
  return parseGstTaxRate(settings.gst_tax_rate);
}

export function getIsGstInclusive(settings: Record<string, string>): boolean {
  return parseIsGstInclusive(settings.is_gst_inclusive);
}

export { resolveCommerceTaxSettings };
