import { GroupedCategoryMultiSelect } from '@/components/GroupedCategoryMultiSelect';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import {
  buildCategoryThemeById,
  ORPHAN_CATEGORY_THEME,
} from '@/lib/category-select-themes';
import { resolvePrimaryCategoryId } from '@/lib/product-categories';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export type ProductCategoryFormValue = {
  categoryIds: number[];
  primaryCategoryId: number | null;
};

type ProductCategoriesFieldsProps = {
  idPrefix: string;
  value: ProductCategoryFormValue;
  sections: AdminCategoryFilterSection[];
  disabled?: boolean;
  onChange: (value: ProductCategoryFormValue) => void;
};

export function ProductCategoriesFields({
  idPrefix,
  value,
  sections,
  disabled = false,
  onChange,
}: ProductCategoriesFieldsProps) {
  const categoryIdStrings = value.categoryIds.map(String);
  const resolvedPrimary = resolvePrimaryCategoryId(
    value.categoryIds,
    value.primaryCategoryId,
  );

  const themeById = useMemo(() => buildCategoryThemeById(sections), [sections]);

  const primaryOptions = value.categoryIds
    .map((categoryId) => {
      const category = sections
        .flatMap((section) => section.categories)
        .find((row) => row.id === categoryId);
      if (!category) return null;
      return { value: String(categoryId), label: category.name };
    })
    .filter((option): option is { value: string; label: string } => option != null);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-categories`}>Categories</Label>
        <GroupedCategoryMultiSelect
          id={`${idPrefix}-categories`}
          sections={sections}
          values={categoryIdStrings}
          onValuesChange={(values) => {
            const categoryIds = values.map((entry) => Number(entry));
            onChange({
              categoryIds,
              primaryCategoryId: resolvePrimaryCategoryId(
                categoryIds,
                value.primaryCategoryId,
              ),
            });
          }}
          disabled={disabled}
          placeholder="Search categories…"
        />
      </div>
      {value.categoryIds.length > 1 ? (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-primary-category`}>
            Primary category
          </Label>
          <Select
            value={resolvedPrimary != null ? String(resolvedPrimary) : ''}
            onValueChange={(nextValue) =>
              onChange({
                ...value,
                primaryCategoryId: nextValue ? Number(nextValue) : null,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger
              id={`${idPrefix}-primary-category`}
              className="border-primary/25 bg-gradient-to-r from-primary/8 via-background to-background shadow-sm transition-colors hover:border-primary/40 hover:from-primary/12"
            >
              <SelectValue placeholder="Select primary category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/10 p-1.5 shadow-lg">
              {primaryOptions.map((option) => {
                const theme =
                  themeById.get(Number(option.value)) ?? ORPHAN_CATEGORY_THEME;
                return (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className={cn('rounded-lg py-2', theme.item)}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn('size-2 shrink-0 rounded-full', theme.dot)}
                      />
                      {option.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

export function formatProductCategoryCell(
  categoryIds: number[],
  primaryCategoryId: number | null,
  categoryNameById: Map<number, string>,
): string {
  if (categoryIds.length === 0) return '—';

  const primaryId =
    resolvePrimaryCategoryId(categoryIds, primaryCategoryId) ??
    categoryIds[0];
  const primaryName = categoryNameById.get(primaryId) ?? '—';
  const extraCount = categoryIds.length - 1;

  if (extraCount <= 0) return primaryName;
  return `${primaryName} (+${extraCount})`;
}
