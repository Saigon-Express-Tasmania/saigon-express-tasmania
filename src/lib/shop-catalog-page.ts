import { redirect } from "@/i18n/navigation";
import {
  buildProductCatalogQuery,
  firstPopulatedCategory,
  parseCatalogCategoryParam,
  parseCatalogPageParam,
  parseCatalogSearchParam,
  PRODUCT_CATALOG_PAGE_SIZE,
  resolveShopBarCategories,
  type ProductCatalogPageParams,
} from "@/lib/product-catalog-page";
import { resolveMenuCategoryFromUrlParam } from "@/lib/menu-category-url";
import type { SiteCategory, SiteCategoryGroup } from "@/types";

export type ShopCatalogSearchParams = {
  category?: string | string[];
  page?: string | string[];
  q?: string | string[];
};

export type ResolvedShopCatalogQuery =
  | {
      empty: true;
      barCategories: SiteCategory[];
      search: string;
    }
  | {
      empty: false;
      barCategories: SiteCategory[];
      category: SiteCategory;
      pageParams: ProductCatalogPageParams;
      search: string;
    };

/**
 * Resolve category/page/q for a shop catalog. Redirects when category is missing
 * or invalid so the sidebar always has a concrete selection.
 */
export function resolveShopCatalogQueryOrRedirect(opts: {
  searchParams: ShopCatalogSearchParams;
  /** Locale-unprefixed path, e.g. `/menu` or `/wholesale/shop`. */
  pathname: string;
  locale: string;
  categories: SiteCategory[];
  populatedIds: ReadonlySet<number>;
  resolveCategory?: (
    param: string | null | undefined,
    categories: Pick<SiteCategory, "id" | "alias" | "name">[],
  ) => Pick<SiteCategory, "id" | "alias" | "name"> | null;
}): ResolvedShopCatalogQuery {
  const {
    searchParams,
    pathname,
    locale,
    categories,
    populatedIds,
    resolveCategory = resolveMenuCategoryFromUrlParam,
  } = opts;

  const barCategories = resolveShopBarCategories(categories, populatedIds);
  const search = parseCatalogSearchParam(searchParams.q);
  const page = parseCatalogPageParam(searchParams.page);
  const defaultCategory = firstPopulatedCategory(categories, populatedIds);

  if (!defaultCategory) {
    return { empty: true, barCategories, search };
  }

  const categoryParam = parseCatalogCategoryParam(searchParams.category);
  const resolved = resolveCategory(categoryParam, barCategories);

  const category =
    resolved != null
      ? (barCategories.find((item) => item.id === resolved.id) ??
        categories.find((item) => item.id === resolved.id) ??
        null)
      : null;

  if (!category) {
    const query = buildProductCatalogQuery({
      categoryAlias: defaultCategory.alias,
      page: page > 1 ? page : undefined,
      q: search || undefined,
    });
    redirect({ href: `${pathname}?${query}`, locale });
    throw new Error("unreachable: redirect to default category");
  }

  if (categoryParam && category.alias !== categoryParam) {
    const query = buildProductCatalogQuery({
      categoryAlias: category.alias,
      page: page > 1 ? page : undefined,
      q: search || undefined,
    });
    redirect({ href: `${pathname}?${query}`, locale });
    throw new Error("unreachable: redirect to category alias");
  }

  return {
    empty: false as const,
    barCategories,
    category,
    pageParams: {
      categoryId: category.id,
      page,
      pageSize: PRODUCT_CATALOG_PAGE_SIZE,
      search: search || undefined,
    },
    search,
  };
}

export type ShopCatalogPageProps = {
  categoriesContent: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
  barCategories: SiteCategory[];
  activeCategoryId: number;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  search: string;
};
