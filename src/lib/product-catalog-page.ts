import { filterCategoriesWithItems } from "@/lib/category-bar";
import { sortCategoriesByDisplayOrder } from "@/lib/category-sort";
import type { SiteCategory } from "@/types";

export const PRODUCT_CATALOG_PAGE_SIZE = 24;

export type ProductCatalogPageResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProductCatalogPageParams = {
  categoryId: number;
  page: number;
  pageSize: number;
  search?: string;
};

export function buildProductCatalogPageResult<T>(
  items: T[],
  totalCount: number,
  page: number,
  pageSize: number,
): ProductCatalogPageResult<T> {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items,
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function parseCatalogPageParam(
  raw: string | string[] | undefined,
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function parseCatalogSearchParam(
  raw: string | string[] | undefined,
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() ?? "";
}

export function parseCatalogCategoryParam(
  raw: string | string[] | undefined,
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildProductCatalogQuery(opts: {
  categoryAlias: string;
  page?: number;
  q?: string;
}): string {
  const params = new URLSearchParams();
  params.set("category", opts.categoryAlias);
  if (opts.page != null && opts.page > 1) {
    params.set("page", String(opts.page));
  }
  const q = opts.q?.trim();
  if (q) params.set("q", q);
  return params.toString();
}

export function firstPopulatedCategory(
  categories: SiteCategory[],
  populatedIds: ReadonlySet<number>,
): SiteCategory | null {
  const populated = filterCategoriesWithItems(categories, populatedIds);
  return sortCategoriesByDisplayOrder(populated)[0] ?? null;
}

export function resolveShopBarCategories(
  categories: SiteCategory[],
  populatedIds: ReadonlySet<number>,
): SiteCategory[] {
  return filterCategoriesWithItems(categories, populatedIds);
}
