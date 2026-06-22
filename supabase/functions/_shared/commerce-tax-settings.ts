import type { createServiceClient } from "./supabase.ts";
import {
  resolveCommerceTaxSettings,
  type CommerceTaxSettings,
} from "./gst.ts";

export type { CommerceTaxSettings };

export async function fetchCommerceTaxSettings(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<CommerceTaxSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["is_gst_inclusive", "gst_tax_rate"]);

  if (error) {
    throw new Error(`Failed to load commerce tax settings: ${error.message}`);
  }

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return resolveCommerceTaxSettings(settings);
}
