import type {
  ProductCategoriesByProductId,
  ProductCategoryAssignment,
} from "@/lib/product-categories";
import { createServerSupabaseClient } from "./server";

export async function loadProductCategoriesByProductIds(
  productIds: number[],
): Promise<ProductCategoriesByProductId> {
  const byProductId: ProductCategoriesByProductId = new Map();
  if (productIds.length === 0) return byProductId;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("product_id, category_id, is_primary, sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true })
    .order("category_id", { ascending: true });

  if (error) {
    throw new Error(`product_categories: ${error.message}`);
  }

  for (const row of data ?? []) {
    const productId = Number(row.product_id);
    const assignments = byProductId.get(productId) ?? [];
    assignments.push({
      categoryId: Number(row.category_id),
      isPrimary: Boolean(row.is_primary),
      sortOrder: Number(row.sort_order ?? 0),
    });
    byProductId.set(productId, assignments);
  }

  return byProductId;
}
