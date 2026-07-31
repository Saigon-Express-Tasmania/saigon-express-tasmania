import { redirect } from "@/i18n/navigation";
import {
  buildProductCatalogQuery,
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
      /** `null` when browsing all categories. */
      category: SiteCategory | null;
      pageParams: ProductCatalogPageParams;
      search: string;
    };

/**
 * Resolve category/page/q for a shop catalog.
 * Missing category means "All". Invalid category aliases redirect to All.
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

  if (barCategories.length === 0 && categories.length === 0) {
    return { empty: true, barCategories, search };
  }

  const categoryParam = parseCatalogCategoryParam(searchParams.category);

  // No category in URL → All products (paginated).
  if (!categoryParam) {
    return {
      empty: false,
      barCategories,
      category: null,
      pageParams: {
        categoryId: null,
        page,
        pageSize: PRODUCT_CATALOG_PAGE_SIZE,
        search: search || undefined,
      },
      search,
    };
  }

  const resolved = resolveCategory(categoryParam, barCategories);
  const category =
    resolved != null
      ? (barCategories.find((item) => item.id === resolved.id) ??
        categories.find((item) => item.id === resolved.id) ??
        null)
      : null;

  // Invalid category → clean URL back to All.
  if (!category) {
    const query = buildProductCatalogQuery({
      page: page > 1 ? page : undefined,
      q: search || undefined,
    });
    redirect({
      href: query ? `${pathname}?${query}` : pathname,
      locale,
    });
    throw new Error("unreachable: redirect to all categories");
  }

  if (category.alias !== categoryParam) {
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
  activeCategoryId: number | null;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  search: string;
};
