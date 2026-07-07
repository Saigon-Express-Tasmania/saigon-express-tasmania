import { CategoryGroupFilterTabs } from '@/components/CategoryGroupFilterTabs';
import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import { countProductsByCategoryGroupId } from '@/lib/category-filter-sections';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

type ProductCategoryGroupFilterStripProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  sections: AdminCategoryFilterSection[];
  products: readonly { categoryIds: number[] }[];
  productCountByGroupId?: ReadonlyMap<number, number>;
  className?: string;
};

export function ProductCategoryGroupFilterStrip({
  id,
  value,
  onValueChange,
  sections,
  products,
  productCountByGroupId: productCountByGroupIdProp,
  className,
}: ProductCategoryGroupFilterStripProps) {
  const productCountByGroupId = useMemo(
    () =>
      productCountByGroupIdProp ??
      countProductsByCategoryGroupId(products, sections),
    [productCountByGroupIdProp, products, sections],
  );

  return (
    <CategoryGroupFilterTabs
      id={id}
      value={value}
      onValueChange={onValueChange}
      sections={sections}
      productCountByGroupId={productCountByGroupId}
      totalProductCount={products.length}
      className={cn(className)}
    />
  );
}
