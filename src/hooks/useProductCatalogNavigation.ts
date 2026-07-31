"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { buildProductCatalogQuery } from "@/lib/product-catalog-page";
import { dispatchCatalogNavigationStart } from "@/lib/catalog-navigation-progress";
import { scrollToCategoryInList } from "@/lib/category-list-scroll";
import type { SiteCategory } from "@/types";

type UseProductCatalogNavigationArgs = {
  categories: Pick<SiteCategory, "id" | "alias">[];
  activeCategoryId: number | null;
  initialSearch: string;
  /** Current server page — used to scroll after pagination navigation settles. */
  page?: number;
  totalPages?: number;
};

export function useProductCatalogNavigation({
  categories,
  activeCategoryId,
  initialSearch,
  page = 1,
  totalPages = 1,
}: UseProductCatalogNavigationArgs) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [searchFromUrl, setSearchFromUrl] = useState(initialSearch);
  const [pendingCategoryId, setPendingCategoryId] = useState<number | null>(
    null,
  );
  const shouldScrollToListRef = useRef(false);

  if (initialSearch !== searchFromUrl) {
    setSearchFromUrl(initialSearch);
    setSearch(initialSearch);
  }

  useEffect(() => {
    setPendingCategoryId(null);
  }, [activeCategoryId, page, initialSearch]);

  const resolveAlias = useCallback(
    (categoryId: number) =>
      categories.find((category) => category.id === categoryId)?.alias ?? null,
    [categories],
  );

  const buildHref = useCallback(
    (opts: { categoryId: number; page?: number; q?: string }) => {
      const alias = resolveAlias(opts.categoryId);
      if (!alias) return null;
      const query = buildProductCatalogQuery({
        categoryAlias: alias,
        page: opts.page,
        q: opts.q || undefined,
      });
      return `${pathname}?${query}`;
    },
    [pathname, resolveAlias],
  );

  const replaceCatalogUrl = useCallback(
    (opts: { categoryId: number; page?: number; q?: string }) => {
      const href = buildHref(opts);
      if (!href) return;
      dispatchCatalogNavigationStart();
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [buildHref, router],
  );

  const prefetchCatalogUrl = useCallback(
    (opts: { categoryId: number; page?: number; q?: string }) => {
      const href = buildHref(opts);
      if (!href) return;
      router.prefetch(href);
    },
    [buildHref, router],
  );

  const handleCategorySelect = useCallback(
    (categoryId: number | null) => {
      if (categoryId == null) return;
      setPendingCategoryId(categoryId);
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

  const prefetchCategory = useCallback(
    (categoryId: number | null) => {
      if (categoryId == null) return;
      prefetchCatalogUrl({
        categoryId,
        page: 1,
        q: search.trim(),
      });
    },
    [prefetchCatalogUrl, search],
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

  // Prefetch adjacent pages for warmer soft navigations.
  useEffect(() => {
    if (activeCategoryId == null) return;
    const q = initialSearch.trim();
    if (page < totalPages) {
      prefetchCatalogUrl({
        categoryId: activeCategoryId,
        page: page + 1,
        q,
      });
    }
    if (page > 1) {
      prefetchCatalogUrl({
        categoryId: activeCategoryId,
        page: page - 1,
        q,
      });
    }
  }, [
    activeCategoryId,
    initialSearch,
    page,
    prefetchCatalogUrl,
    totalPages,
  ]);

  const displayCategoryId = pendingCategoryId ?? activeCategoryId;

  return {
    search,
    setSearch,
    isPending,
    pendingCategoryId,
    displayCategoryId,
    handleCategorySelect,
    handlePageChange,
    prefetchCategory,
    clearSearch: () => {
      setSearch("");
      if (activeCategoryId == null) return;
      replaceCatalogUrl({ categoryId: activeCategoryId, page: 1, q: "" });
    },
  };
}
