import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { mapWholesaleProductRow, type WholesaleProduct } from "@/types";
import { categoryMapById } from "@/lib/product-category";
import { getProductCategoryAssignments } from "@/lib/product-categories";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { getCategoriesByKind } from "./categories";
import { loadProductCategoriesByProductIds } from "./product-categories";
import { fetchWholesaleProductRows } from "./products";

const CACHE_TAG = CACHE_TAGS.wholesaleProducts;

async function loadWholesaleProducts(): Promise<WholesaleProduct[]> {
  const [rows, categories] = await Promise.all([
    fetchWholesaleProductRows(),
    getCategoriesByKind("wholesale"),
  ]);
  const categoriesByProductId = await loadProductCategoriesByProductIds(
    rows.map((row) => row.id),
  );
  const categoryById = categoryMapById(categories);
  return rows.map((row) =>
    mapWholesaleProductRow(
      row,
      getProductCategoryAssignments(categoriesByProductId, row.id),
      categoryById,
    ),
  );
}

/**
 * Wholesale products for the public wholesale shop, cached via Next.js unstable_cache.
 */
export const getWholesaleProducts = unstable_cache(
  loadWholesaleProducts,
  [CACHE_TAG, SERVER_CACHE_INSTANCE_ID],
  { revalidate: SHORT_REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);
