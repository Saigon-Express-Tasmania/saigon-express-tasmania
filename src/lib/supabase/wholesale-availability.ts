import "server-only";

import {
  applyWholesaleProductAvailability,
  mapWholesaleProductRow,
  type WholesaleProduct,
  type WholesaleProductAvailabilityRow,
  type WholesaleProductRow,
} from "@/types";
import { categoryMapById, type CategoryLookup } from "@/lib/product-category";
import type { ProductCategoriesByProductId } from "@/lib/product-categories";
import { getProductCategoryAssignments } from "@/lib/product-categories";
import {
  buildWholesaleProductsAvailabilityRpcArgs,
  isWholesaleAvailabilityRpcMissing,
} from "@/lib/wholesale-availability-rpc";
import { createServerSupabaseClient } from "./server";

export async function fetchWholesaleProductsAvailability(
  customerAccount?: string | null,
): Promise<WholesaleProductAvailabilityRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "get_wholesale_products_availability",
    buildWholesaleProductsAvailabilityRpcArgs(customerAccount),
  );

  if (error) {
    if (isWholesaleAvailabilityRpcMissing(error)) {
      console.warn(
        `[wholesale-availability] ${error.message}; using empty inventory snapshot.`,
      );
      return [];
    }

    throw new Error(`get_wholesale_products_availability: ${error.message}`);
  }

  return (data ?? []) as WholesaleProductAvailabilityRow[];
}

export function mergeWholesaleProductsWithAvailability(
  rows: WholesaleProductRow[],
  availabilityRows: WholesaleProductAvailabilityRow[],
  categoriesByProductId: ProductCategoriesByProductId = new Map(),
  categoryById: Map<number, CategoryLookup> = new Map(),
): WholesaleProduct[] {
  const availabilityByProductId = new Map(
    availabilityRows.map((row) => [row.product_id, row]),
  );

  return rows.map((row) =>
    applyWholesaleProductAvailability(
      mapWholesaleProductRow(
        row,
        getProductCategoryAssignments(categoriesByProductId, row.id),
        categoryById,
      ),
      availabilityByProductId.get(row.id),
    ),
  );
}
