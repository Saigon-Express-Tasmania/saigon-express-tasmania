import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { ENV } from "@/config/env";
import type { ProductType } from "./products";
import { createServerSupabaseClient } from "./server";
import type {
  ProductCategoriesByProductId,
  ProductCategoryAssignment,
} from "@/lib/product-categories";

const PRODUCT_CACHE_TAGS: Record<ProductType, string> = {
  alacarte: CACHE_TAGS.menu,
  wholesale: CACHE_TAGS.wholesaleProducts,
  catering: CACHE_TAGS.cateringPacks,
};

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
    } satisfies ProductCategoryAssignment);
    byProductId.set(productId, assignments);
  }

  return byProductId;
}

async function queryPopulatedCategoryIdsByProductType(
  productType: ProductType,
): Promise<number[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("product_categories")
    .select("category_id, products!inner(id)")
    .eq("products.product_type", productType)
    .eq("products.is_available", true);

  if (!ENV.useUnpublishedProducts) {
    query = query.eq("products.is_published", true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(
      `populated product categories (${productType}): ${error.message}`,
    );
  }

  const ids = new Set<number>();
  for (const row of data ?? []) {
    ids.add(Number(row.category_id));
  }
  return [...ids];
}

export async function getPopulatedCategoryIdsByProductType(
  productType: ProductType,
): Promise<ReadonlySet<number>> {
  const ids = await unstable_cache(
    () => queryPopulatedCategoryIdsByProductType(productType),
    [
      "product-categories",
      "populated-ids",
      productType,
      ENV.useUnpublishedProducts ? "include-unpublished" : "published-only",
    ],
    {
      revalidate: SHORT_REVALIDATE_SECONDS,
      tags: [PRODUCT_CACHE_TAGS[productType]],
    },
  )();
  return new Set(ids);
}
