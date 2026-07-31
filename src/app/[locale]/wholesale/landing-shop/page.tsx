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

  const [categoryCatalog, pricingTiers, populatedIds] = await Promise.all([
    getCategoryCatalogByKind("wholesale"),
    getWholesaleTiers(),
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

  const productPage = resolved.empty
    ? buildProductCatalogPageResult([], 0, 1, PRODUCT_CATALOG_PAGE_SIZE)
    : await getWholesaleProductsPage(resolved.pageParams, categoriesContent);

  return (
    <Suspense fallback={null}>
      <WholesaleLandingShop
        products={productPage.items}
        categoriesContent={categoriesContent}
        categoryGroups={categoryGroups}
        barCategories={resolved.barCategories}
        activeCategoryId={resolved.empty ? null : resolved.category.id}
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
