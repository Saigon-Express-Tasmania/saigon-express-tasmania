import { useMemo } from 'react';
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
import {
  buildTaxonomyFilterSections,
  taxonomyLabelById,
  type TaxonomyFilterOption,
} from '@/lib/taxonomy-filter-sections';
import { cn } from '@/lib/utils';
import { CircleOff, LayoutGrid } from 'lucide-react';

type TaxonomyFilterSelectProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: TaxonomyFilterOption[];
  sections?: AdminCategoryFilterSection[];
  allLabel: string;
  noneLabel: string;
  triggerClassName?: string;
  orphanSectionLabel?: string;
};

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

function TaxonomyFilterOptionRow({
  name,
  theme,
}: {
  name: string;
  theme: { dot: string; item: string };
}) {
  return (
    <span className="flex w-full min-w-0 items-center gap-2.5 pr-4">
      <span className={cn('size-2 shrink-0 rounded-full', theme.dot)} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
    </span>
  );
}

export function TaxonomyFilterSelect({
  id,
  value,
  onValueChange,
  options,
  sections: sectionsProp,
  allLabel,
  noneLabel,
  triggerClassName,
  orphanSectionLabel = 'Ungrouped',
}: TaxonomyFilterSelectProps) {
  const sections = useMemo(
    () => sectionsProp ?? buildTaxonomyFilterSections(options),
    [options, sectionsProp],
  );
  const labelsById = useMemo(() => taxonomyLabelById(options), [options]);

  const selectedLabel =
    value === 'all'
      ? allLabel
      : value === 'none'
        ? noneLabel
        : labelsById.get(Number.parseInt(value, 10));

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
        <SelectValue placeholder={allLabel}>
          {selectedLabel ?? allLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80 min-w-[19rem] rounded-xl border-primary/10 p-1.5 shadow-lg">
        <SelectItem
          value="all"
          className={cn('rounded-lg py-2', ALL_CATEGORIES_THEME.item)}
        >
          <span className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <LayoutGrid className="size-3.5" />
            </span>
            {allLabel}
          </span>
        </SelectItem>
        <SelectItem
          value="none"
          className={cn('rounded-lg py-2', ORPHAN_CATEGORY_THEME.item)}
        >
          <span className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <CircleOff className="size-3.5" />
            </span>
            {noneLabel}
          </span>
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
                    <TaxonomyFilterOptionRow
                      name={category.name}
                      theme={ORPHAN_CATEGORY_THEME}
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
              {section.categories.map((category) => (
                <SelectItem
                  key={category.id}
                  value={String(category.id)}
                  className={cn('rounded-lg py-2', theme.item)}
                >
                  <TaxonomyFilterOptionRow
                    name={category.name}
                    theme={theme}
                  />
                </SelectItem>
              ))}
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
