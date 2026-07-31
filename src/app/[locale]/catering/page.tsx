import { Suspense } from "react";
import { ProductCustomizationsProvider } from "@/contexts/ProductCustomizationsContext";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { getCateringPacksPage } from "@/lib/supabase/catering-packs";
import { getPopulatedCategoryIdsByProductType } from "@/lib/supabase/product-categories";
import { getProductCustomizationsCatalog } from "@/lib/supabase/product-customizations";
import {
  PRODUCT_CATALOG_PAGE_SIZE,
  buildProductCatalogPageResult,
} from "@/lib/product-catalog-page";
import {
  resolveShopCatalogQueryOrRedirect,
  type ShopCatalogSearchParams,
} from "@/lib/shop-catalog-page";
import { resolveCateringCategoryFromUrlParam } from "@/lib/catering-category-url";
import { pageMetadata } from "@/lib/seo-metadata";
import Catering from "@/views/Catering";

export const metadata = pageMetadata("catering");

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ShopCatalogSearchParams>;
};

export default async function LocalizedCateringPage({
  params,
  searchParams,
}: PageProps) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);

  const [categoryCatalog, populatedIds] = await Promise.all([
    getCategoryCatalogByKind("catering"),
    getPopulatedCategoryIdsByProductType("catering"),
  ]);

  const { categories: categoriesContent, categoryGroups } = categoryCatalog;
  const resolved = resolveShopCatalogQueryOrRedirect({
    searchParams: sp,
    pathname: "/catering",
    locale,
    categories: categoriesContent,
    populatedIds,
    resolveCategory: resolveCateringCategoryFromUrlParam,
  });

  const [productPage, customizationsCatalog] = await Promise.all([
    resolved.empty
      ? Promise.resolve(
          buildProductCatalogPageResult([], 0, 1, PRODUCT_CATALOG_PAGE_SIZE),
        )
      : getCateringPacksPage(resolved.pageParams, categoriesContent),
    getProductCustomizationsCatalog(),
  ]);

  return (
    <ProductCustomizationsProvider
      catalog={customizationsCatalog}
      categories={categoriesContent}
      categoryKey="name"
      kind="catering"
    >
      <Suspense fallback={null}>
        <Catering
          packs={productPage.items}
          categoriesContent={categoriesContent}
          categoryGroups={categoryGroups}
          barCategories={resolved.barCategories}
          activeCategoryId={resolved.empty ? null : resolved.category.id}
          page={productPage.page}
          pageSize={productPage.pageSize}
          totalCount={productPage.totalCount}
          totalPages={productPage.totalPages}
          initialSearch={resolved.search}
        />
      </Suspense>
    </ProductCustomizationsProvider>
  );
}
