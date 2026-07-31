import { Suspense } from "react";
import { ProductCustomizationsProvider } from "@/contexts/ProductCustomizationsContext";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { getMenuItemsPage } from "@/lib/supabase/menu";
import { getPopulatedCategoryIdsByProductType } from "@/lib/supabase/product-categories";
import { getProductCustomizationsCatalog } from "@/lib/supabase/product-customizations";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";
import {
  PRODUCT_CATALOG_PAGE_SIZE,
  buildProductCatalogPageResult,
} from "@/lib/product-catalog-page";
import {
  resolveShopCatalogQueryOrRedirect,
  type ShopCatalogSearchParams,
} from "@/lib/shop-catalog-page";
import { pageMetadata } from "@/lib/seo-metadata";
import Menu from "@/views/Menu";

export const metadata = pageMetadata("menu");

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ShopCatalogSearchParams>;
};

export default async function LocaleMenuPage({
  params,
  searchParams,
}: PageProps) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);

  const [categoryCatalog, populatedIds] = await Promise.all([
    getCategoryCatalogByKind("menu"),
    getPopulatedCategoryIdsByProductType("alacarte"),
  ]);

  const { categories: categoriesContent, categoryGroups } = categoryCatalog;
  const resolved = resolveShopCatalogQueryOrRedirect({
    searchParams: sp,
    pathname: "/menu",
    locale,
    categories: categoriesContent,
    populatedIds,
  });

  const [productPage, storeLocations, customizationsCatalog] =
    await Promise.all([
      resolved.empty
        ? Promise.resolve(
            buildProductCatalogPageResult([], 0, 1, PRODUCT_CATALOG_PAGE_SIZE),
          )
        : getMenuItemsPage(resolved.pageParams, categoriesContent),
      getActiveStoreLocations(),
      getProductCustomizationsCatalog(),
    ]);

  return (
    <ProductCustomizationsProvider
      catalog={customizationsCatalog}
      categories={categoriesContent}
    >
      <Suspense fallback={null}>
        <Menu
          menuItems={productPage.items}
          storeLocations={storeLocations}
          categoriesContent={categoriesContent}
          categoryGroups={categoryGroups}
          barCategories={resolved.barCategories}
          activeCategoryId={
            resolved.empty ? null : resolved.category.id
          }
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
