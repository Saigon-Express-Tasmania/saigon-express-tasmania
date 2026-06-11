import "server-only";

import {
  applyWholesaleProductAvailability,
  mapWholesaleProductRow,
  type WholesaleProduct,
  type WholesaleProductAvailabilityRow,
  type WholesaleProductRow,
} from "@/types";
import { createServerSupabaseClient } from "./server";

export async function fetchWholesaleProductsAvailability(
  customerAccount?: string | null,
): Promise<WholesaleProductAvailabilityRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_wholesale_products_availability", {
    p_customer_account: customerAccount ?? null,
  });

  if (error) {
    throw new Error(`get_wholesale_products_availability: ${error.message}`);
  }

  return (data ?? []) as WholesaleProductAvailabilityRow[];
}

export function mergeWholesaleProductsWithAvailability(
  rows: WholesaleProductRow[],
  availabilityRows: WholesaleProductAvailabilityRow[],
): WholesaleProduct[] {
  const availabilityByProductId = new Map(
    availabilityRows.map((row) => [row.product_id, row]),
  );

  return rows.map((row) =>
    applyWholesaleProductAvailability(
      mapWholesaleProductRow(row),
      availabilityByProductId.get(row.id),
    ),
  );
}
