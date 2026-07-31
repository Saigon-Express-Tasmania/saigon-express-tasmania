"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { buildProductCatalogQuery } from "@/lib/product-catalog-page";
import { scrollToCategoryInList } from "@/lib/category-list-scroll";
import type { SiteCategory } from "@/types";

type UseProductCatalogNavigationArgs = {
  categories: Pick<SiteCategory, "id" | "alias">[];
  activeCategoryId: number | null;
  initialSearch: string;
  /** Current server page — used to scroll after pagination navigation settles. */
  page?: number;
};

export function useProductCatalogNavigation({
  categories,
  activeCategoryId,
  initialSearch,
  page,
}: UseProductCatalogNavigationArgs) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(initialSearch);
  const [searchFromUrl, setSearchFromUrl] = useState(initialSearch);
  const shouldScrollToListRef = useRef(false);

  if (initialSearch !== searchFromUrl) {
    setSearchFromUrl(initialSearch);
    setSearch(initialSearch);
  }

  const resolveAlias = useCallback(
    (categoryId: number) =>
      categories.find((category) => category.id === categoryId)?.alias ?? null,
    [categories],
  );

  const replaceCatalogUrl = useCallback(
    (opts: { categoryId: number; page?: number; q?: string }) => {
      const alias = resolveAlias(opts.categoryId);
      if (!alias) return;
      const query = buildProductCatalogQuery({
        categoryAlias: alias,
        page: opts.page,
        q: opts.q || undefined,
      });
      router.replace(`${pathname}?${query}`, { scroll: false });
    },
    [pathname, resolveAlias, router],
  );

  const handleCategorySelect = useCallback(
    (categoryId: number | null) => {
      if (categoryId == null) return;
      replaceCatalogUrl({
        categoryId,
        page: 1,
        q: search.trim(),
      });
      scrollToCategoryInList(categoryId);
    },
    [replaceCatalogUrl, search],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (activeCategoryId == null) return;
      shouldScrollToListRef.current = true;
      replaceCatalogUrl({
        categoryId: activeCategoryId,
        page: nextPage,
        q: search.trim(),
      });
    },
    [activeCategoryId, replaceCatalogUrl, search],
  );

  useEffect(() => {
    if (!shouldScrollToListRef.current) return;
    shouldScrollToListRef.current = false;
    scrollToCategoryInList(activeCategoryId);
  }, [page, activeCategoryId]);

  useEffect(() => {
    if (activeCategoryId == null) return;
    const trimmed = search.trim();
    if (trimmed === initialSearch.trim()) return;

    const handle = window.setTimeout(() => {
      replaceCatalogUrl({
        categoryId: activeCategoryId,
        page: 1,
        q: trimmed,
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, initialSearch, activeCategoryId, replaceCatalogUrl]);

  return {
    search,
    setSearch,
    handleCategorySelect,
    handlePageChange,
    clearSearch: () => {
      setSearch("");
      if (activeCategoryId == null) return;
      replaceCatalogUrl({ categoryId: activeCategoryId, page: 1, q: "" });
    },
  };
}
