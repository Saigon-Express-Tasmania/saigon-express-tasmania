import { Suspense } from "react";
import WholesaleShop from "@/views/WholesaleShop";
import { getPopulatedCategoryIdsByProductType } from "@/lib/supabase/product-categories";
import {
  loadWholesaleCatalogPageData,
} from "@/lib/wholesale-page";
import {
  PRODUCT_CATALOG_PAGE_SIZE,
  buildProductCatalogPageResult,
} from "@/lib/product-catalog-page";
import {
  resolveShopCatalogQueryOrRedirect,
  type ShopCatalogSearchParams,
} from "@/lib/shop-catalog-page";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ShopCatalogSearchParams>;
};

export default async function LocaleWholesaleShopPage({
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
    pathname: "/wholesale/shop",
    locale,
    categories: categoriesContent,
    populatedIds,
  });

  if (resolved.empty) {
    const empty = buildProductCatalogPageResult(
      [],
      0,
      1,
      PRODUCT_CATALOG_PAGE_SIZE,
    );
    return (
      <Suspense fallback={null}>
        <WholesaleShop
          products={[]}
          inventory={[]}
          categoriesContent={categoriesContent}
          categoryGroups={categoryGroups}
          barCategories={resolved.barCategories}
          activeCategoryId={null}
          page={empty.page}
          pageSize={empty.pageSize}
          totalCount={empty.totalCount}
          totalPages={empty.totalPages}
          initialSearch={resolved.search}
        />
      </Suspense>
    );
  }

  const data = await loadWholesaleCatalogPageData(resolved.pageParams);

  return (
    <Suspense fallback={null}>
      <WholesaleShop
        products={data.products}
        inventory={data.inventory}
        categoriesContent={data.categoriesContent}
        categoryGroups={data.categoryGroups}
        barCategories={resolved.barCategories}
        activeCategoryId={resolved.category.id}
        page={data.page}
        pageSize={data.pageSize}
        totalCount={data.totalCount}
        totalPages={data.totalPages}
        initialSearch={resolved.search}
      />
    </Suspense>
  );
}
