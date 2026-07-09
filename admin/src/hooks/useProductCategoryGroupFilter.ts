import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import {
  countProductsByCategoryGroupId,
  countProductsByCategoryId,
  filterSectionsByGroupId,
  flattenAdminCategoryFilterSections,
  sortSectionsByProductCount,
} from '@/lib/category-filter-sections';
import { useCallback, useMemo, useState } from 'react';

type ProductWithCategoryIds = { categoryIds: number[] };

export function useProductCategoryGroupFilter(
  products: readonly ProductWithCategoryIds[],
  sections: AdminCategoryFilterSection[],
) {
  const [categoryGroupFilter, setCategoryGroupFilter] = useState('all');

  const productCountByCategoryId = useMemo(
    () => countProductsByCategoryId(products),
    [products],
  );

  const productCountByGroupId = useMemo(
    () => countProductsByCategoryGroupId(products, sections),
    [products, sections],
  );

  const scopedCategoryFilterSections = useMemo(() => {
    const scoped = filterSectionsByGroupId(
      sections,
      categoryGroupFilter === 'all' ? 'all' : Number(categoryGroupFilter),
    );
    return sortSectionsByProductCount(scoped, productCountByCategoryId);
  }, [sections, categoryGroupFilter, productCountByCategoryId]);

  const scopedCategoryIds = useMemo(() => {
    if (categoryGroupFilter === 'all') return null;
    return new Set(
      flattenAdminCategoryFilterSections(scopedCategoryFilterSections).map(
        (category) => category.id,
      ),
    );
  }, [categoryGroupFilter, scopedCategoryFilterSections]);

  const scopedTotalProductCount = useMemo(() => {
    if (scopedCategoryIds === null) return products.length;
    return products.filter((product) =>
      product.categoryIds.some((categoryId) => scopedCategoryIds.has(categoryId)),
    ).length;
  }, [products, scopedCategoryIds]);

  const onCategoryGroupFilterChange = useCallback((value: string) => {
    setCategoryGroupFilter(value);
  }, []);

  return {
    categoryGroupFilter,
    setCategoryGroupFilter,
    onCategoryGroupFilterChange,
    productCountByCategoryId,
    productCountByGroupId,
    scopedCategoryFilterSections,
    scopedCategoryIds,
    scopedTotalProductCount,
  };
}
