import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import {
  ALL_CATEGORIES_THEME,
  categoryGroupTheme,
  ORPHAN_CATEGORY_THEME,
} from '@/lib/category-select-themes';
import { cn } from '@/lib/utils';
import { LayoutGrid } from 'lucide-react';

type CategoryFilterSelectProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  sections: AdminCategoryFilterSection[];
  productCountByCategoryId?: ReadonlyMap<number, number>;
  totalProductCount?: number;
  triggerClassName?: string;
  orphanSectionLabel?: string;
};

function CategoryFilterOption({
  name,
  count,
  badgeClass,
  leading,
}: {
  name: string;
  count: number;
  badgeClass: string;
  leading?: ReactNode;
}) {
  return (
    <span className="flex w-full min-w-0 items-center gap-2.5 pr-4">
      {leading}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums',
          badgeClass,
        )}
      >
        {count}
      </span>
    </span>
  );
}

function CategoryGroupHeading({
  label,
  theme,
}: {
  label: string;
  theme: { label: string; bar: string };
}) {
  return (
    <SelectLabel
      className={cn(
        'flex items-center gap-2 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.14em]',
        theme.label,
      )}
    >
      <span className={cn('h-4 w-1 shrink-0 rounded-full', theme.bar)} />
      <span className="truncate">{label}</span>
    </SelectLabel>
  );
}

export function CategoryFilterSelect({
  id,
  value,
  onValueChange,
  sections,
  productCountByCategoryId,
  totalProductCount,
  triggerClassName,
  orphanSectionLabel = 'Ungrouped',
}: CategoryFilterSelectProps) {
  const countForCategory = (categoryId: number) =>
    productCountByCategoryId?.get(categoryId) ?? 0;

  let groupThemeIndex = 0;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id={id}
        className={cn(
          'w-56 border-primary/25 bg-gradient-to-r from-primary/8 via-background to-background shadow-sm transition-colors hover:border-primary/40 hover:from-primary/12',
          triggerClassName,
        )}
      >
        <SelectValue placeholder="All categories" />
      </SelectTrigger>
      <SelectContent className="max-h-80 min-w-[19rem] rounded-xl border-primary/10 p-1.5 shadow-lg">
        <SelectItem
          value="all"
          className={cn('rounded-lg py-2', ALL_CATEGORIES_THEME.item)}
        >
          {totalProductCount != null ? (
            <CategoryFilterOption
              name="All categories"
              count={totalProductCount}
              badgeClass={ALL_CATEGORIES_THEME.badge}
              leading={
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <LayoutGrid className="size-3.5" />
                </span>
              }
            />
          ) : (
            <span className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                <LayoutGrid className="size-3.5" />
              </span>
              All categories
            </span>
          )}
        </SelectItem>

        {sections.length > 0 ? <SelectSeparator className="my-1.5" /> : null}

        {sections.map((section, sectionIndex) => {
          if (section.type === 'orphans') {
            return (
              <SelectGroup key="orphans" className="pb-0.5">
                <CategoryGroupHeading
                  label={orphanSectionLabel}
                  theme={ORPHAN_CATEGORY_THEME}
                />
                {section.categories.map((category) => (
                  <SelectItem
                    key={category.id}
                    value={String(category.id)}
                    className={cn('rounded-lg py-2', ORPHAN_CATEGORY_THEME.item)}
                  >
                    <CategoryFilterOption
                      name={category.name}
                      count={countForCategory(category.id)}
                      badgeClass={
                        countForCategory(category.id) === 0
                          ? ORPHAN_CATEGORY_THEME.badgeEmpty
                          : ORPHAN_CATEGORY_THEME.badge
                      }
                      leading={
                        <span
                          className={cn(
                            'size-2 shrink-0 rounded-full',
                            ORPHAN_CATEGORY_THEME.dot,
                          )}
                        />
                      }
                    />
                  </SelectItem>
                ))}
                {sectionIndex < sections.length - 1 ? (
                  <SelectSeparator className="my-1.5" />
                ) : null}
              </SelectGroup>
            );
          }

          const theme = categoryGroupTheme(groupThemeIndex++);

          return (
            <SelectGroup key={`group-${section.groupId}`} className="pb-0.5">
              <CategoryGroupHeading label={section.groupName} theme={theme} />
              {section.categories.map((category) => {
                const count = countForCategory(category.id);
                return (
                  <SelectItem
                    key={category.id}
                    value={String(category.id)}
                    className={cn('rounded-lg py-2', theme.item)}
                  >
                    <CategoryFilterOption
                      name={category.name}
                      count={count}
                      badgeClass={
                        count === 0 ? theme.badgeEmpty : theme.badge
                      }
                      leading={
                        <span
                          className={cn('size-2 shrink-0 rounded-full', theme.dot)}
                        />
                      }
                    />
                  </SelectItem>
                );
              })}
              {sectionIndex < sections.length - 1 ? (
                <SelectSeparator className="my-1.5" />
              ) : null}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
