import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { mapWholesaleProductRow, type WholesaleProduct } from "@/types";
import { categoryMapById } from "@/lib/product-category";
import { getProductCategoryAssignments } from "@/lib/product-categories";
import {
  buildProductCatalogPageResult,
  type ProductCatalogPageParams,
  type ProductCatalogPageResult,
} from "@/lib/product-catalog-page";
import type { SiteCategory } from "@/types";
import { getCategoriesByKind } from "./categories";
import { loadProductCategoriesByProductIds } from "./product-categories";
import {
  fetchWholesaleProductRows,
  fetchWholesaleProductsPage,
} from "./products";

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
  [CACHE_TAG],
  { revalidate: SHORT_REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);

/**
 * Paginated wholesale catalog page (no live stock). Pass page categories from the RSC.
 * Category assignments come from the page query embed (no second round-trip).
 */
export async function getWholesaleProductsPage(
  params: ProductCatalogPageParams,
  categories: SiteCategory[],
): Promise<ProductCatalogPageResult<WholesaleProduct>> {
  const { rows, totalCount, categoriesByProductId } =
    await fetchWholesaleProductsPage(params);
  const categoryById = categoryMapById(categories);
  const items = rows.map((row) =>
    mapWholesaleProductRow(
      row,
      getProductCategoryAssignments(categoriesByProductId, row.id),
      categoryById,
    ),
  );
  return buildProductCatalogPageResult(
    items,
    totalCount,
    params.page,
    params.pageSize,
  );
}
