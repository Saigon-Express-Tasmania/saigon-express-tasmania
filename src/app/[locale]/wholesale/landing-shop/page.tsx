import { Suspense } from "react";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { getPopulatedCategoryIdsByProductType } from "@/lib/supabase/product-categories";
import { getWholesaleProductsPage } from "@/lib/supabase/wholesale-products";
import { getWholesaleTiers } from "@/lib/supabase/wholesale-tiers";
import {
  PRODUCT_CATALOG_PAGE_SIZE,
  buildProductCatalogPageResult,
} from "@/lib/product-catalog-page";
import {
  resolveShopCatalogQueryOrRedirect,
  type ShopCatalogSearchParams,
} from "@/lib/shop-catalog-page";
import WholesaleLandingShop from "@/views/WholesaleLandingShop";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ShopCatalogSearchParams>;
};

export default async function LocaleWholesaleLandingShopPage({
  params,
  searchParams,
}: PageProps) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);

  const [categoryCatalog, populatedIds] = await Promise.all([
    getCategoryCatalogByKind("wholesale"),
    getPopulatedCategoryIdsByProductType("wholesale"),
  ]);
  const { categories: categoriesContent, categoryGroups } = categoryCatalog;

  const resolved = resolveShopCatalogQueryOrRedirect({
    searchParams: sp,
    pathname: "/wholesale/landing-shop",
    locale,
    categories: categoriesContent,
    populatedIds,
  });

  const [productPage, pricingTiers] = await Promise.all([
    resolved.empty
      ? Promise.resolve(
          buildProductCatalogPageResult([], 0, 1, PRODUCT_CATALOG_PAGE_SIZE),
        )
      : getWholesaleProductsPage(resolved.pageParams, categoriesContent),
    getWholesaleTiers(),
  ]);

  return (
    <Suspense fallback={null}>
      <WholesaleLandingShop
        products={productPage.items}
        categoriesContent={categoriesContent}
        categoryGroups={categoryGroups}
        barCategories={resolved.barCategories}
        activeCategoryId={resolved.empty ? null : (resolved.category?.id ?? null)}
        page={productPage.page}
        pageSize={productPage.pageSize}
        totalCount={productPage.totalCount}
        totalPages={productPage.totalPages}
        initialSearch={resolved.search}
        pricingTiers={pricingTiers}
      />
    </Suspense>
  );
}
