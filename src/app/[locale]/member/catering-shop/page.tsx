import { Suspense } from "react";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { getCateringPacksPage } from "@/lib/supabase/catering-packs";
import { getPopulatedCategoryIdsByProductType } from "@/lib/supabase/product-categories";
import {
  PRODUCT_CATALOG_PAGE_SIZE,
  buildProductCatalogPageResult,
} from "@/lib/product-catalog-page";
import {
  resolveShopCatalogQueryOrRedirect,
  type ShopCatalogSearchParams,
} from "@/lib/shop-catalog-page";
import { resolveCateringCategoryFromUrlParam } from "@/lib/catering-category-url";
import MemberCateringShop from "@/views/MemberCateringShop";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ShopCatalogSearchParams>;
};

export default async function LocaleMemberCateringShopPage({
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
    pathname: "/member/catering-shop",
    locale,
    categories: categoriesContent,
    populatedIds,
    resolveCategory: resolveCateringCategoryFromUrlParam,
  });

  const productPage = resolved.empty
    ? buildProductCatalogPageResult([], 0, 1, PRODUCT_CATALOG_PAGE_SIZE)
    : await getCateringPacksPage(resolved.pageParams, categoriesContent);

  return (
    <Suspense fallback={null}>
      <MemberCateringShop
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
  );
}
