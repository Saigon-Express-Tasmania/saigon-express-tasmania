import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import { extractCategoryGroupsFromSections } from '@/lib/category-filter-sections';
import {
  ALL_GROUPS_TAB_PILL_CLASS,
  buildGroupThemeIndexById,
  categoryGroupTabDotClass,
  categoryGroupTabPillClass,
} from '@/lib/category-select-themes';
import { cn } from '@/lib/utils';
import { LayoutGrid } from 'lucide-react';
import { useMemo } from 'react';

type CategoryGroupFilterTabsProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  sections: AdminCategoryFilterSection[];
  productCountByGroupId?: ReadonlyMap<number, number>;
  totalProductCount?: number;
  className?: string;
};

const tabPillBaseClass =
  'gap-1.5 border px-3 py-1.5 shadow-none data-[state=active]:shadow-sm';

function GroupTabCountBadge({
  count,
  active,
}: {
  count: number;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none',
        active
          ? 'bg-white/25 text-inherit'
          : 'bg-black/5 text-inherit dark:bg-white/10',
      )}
    >
      {count}
    </span>
  );
}

export function CategoryGroupFilterTabs({
  id,
  value,
  onValueChange,
  sections,
  productCountByGroupId,
  totalProductCount,
  className,
}: CategoryGroupFilterTabsProps) {
  const groups = useMemo(
    () => extractCategoryGroupsFromSections(sections),
    [sections],
  );
  const groupThemeIndexById = useMemo(
    () => buildGroupThemeIndexById(sections),
    [sections],
  );

  if (groups.length === 0) return null;

  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn('gap-0', className)}>
      <TabsList
        id={id}
        aria-label="Filter by category group"
        className="h-auto w-full flex-wrap justify-start gap-1.5 bg-transparent p-0"
      >
        <TabsTrigger
          value="all"
          className={cn(tabPillBaseClass, ALL_GROUPS_TAB_PILL_CLASS)}
        >
          <LayoutGrid className="size-3.5 shrink-0 opacity-80" aria-hidden />
          All groups
          {totalProductCount != null ? (
            <GroupTabCountBadge
              count={totalProductCount}
              active={value === 'all'}
            />
          ) : null}
        </TabsTrigger>
        {groups.map((group) => {
          const themeIndex = groupThemeIndexById.get(group.id) ?? 0;
          const groupCount = productCountByGroupId?.get(group.id);
          const isActive = value === String(group.id);
          return (
            <TabsTrigger
              key={group.id}
              value={String(group.id)}
              className={cn(
                tabPillBaseClass,
                categoryGroupTabPillClass(themeIndex),
              )}
            >
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  categoryGroupTabDotClass(themeIndex),
                )}
                aria-hidden
              />
              {group.name}
              {groupCount != null ? (
                <GroupTabCountBadge count={groupCount} active={isActive} />
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
