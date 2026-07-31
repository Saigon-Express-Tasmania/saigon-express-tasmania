import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { mapMenuItemRow } from "@/types";
import type { MenuItem } from "@/contexts/CartContext";
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
  fetchAlacarteProductRows,
  fetchAlacarteProductsPage,
} from "./products";

const CACHE_TAG = CACHE_TAGS.menu;

async function loadMenuItems(): Promise<MenuItem[]> {
  const [rows, categories] = await Promise.all([
    fetchAlacarteProductRows(),
    getCategoriesByKind("menu"),
  ]);
  const categoriesByProductId = await loadProductCategoriesByProductIds(
    rows.map((row) => row.id),
  );
  const categoryById = categoryMapById(categories);
  return rows.map((row) =>
    mapMenuItemRow(
      row,
      getProductCategoryAssignments(categoriesByProductId, row.id),
      categoryById,
    ),
  );
}

/**
 * Alacarte menu items for the public site, cached via Next.js unstable_cache.
 */
export const getMenuItems = unstable_cache(
  loadMenuItems,
  [CACHE_TAG],
  { revalidate: SHORT_REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);

/**
 * Paginated alacarte items for a single category. Catalog fields only.
 * Pass `categories` from the page catalog to avoid a second category fetch.
 */
export async function getMenuItemsPage(
  params: ProductCatalogPageParams,
  categories: SiteCategory[],
): Promise<ProductCatalogPageResult<MenuItem>> {
  const { rows, totalCount } = await fetchAlacarteProductsPage(params);
  const categoriesByProductId = await loadProductCategoriesByProductIds(
    rows.map((row) => row.id),
  );
  const categoryById = categoryMapById(categories);
  const items = rows.map((row) =>
    mapMenuItemRow(
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
