import { Input } from '@/components/ui/input';
import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import {
  ALL_CATEGORIES_THEME,
  buildGroupThemeIndexById,
  categoryGroupTheme,
  filterCategorySections,
  flattenCategorySections,
  ORPHAN_CATEGORY_THEME,
  type CategoryGroupTheme,
} from '@/lib/category-select-themes';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, LayoutGrid } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

function CategoryGroupHeading({
  label,
  theme,
}: {
  label: string;
  theme: CategoryGroupTheme;
}) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-center gap-2 border-b bg-popover/95 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-sm',
        theme.label,
      )}
    >
      <span className={cn('h-4 w-1 shrink-0 rounded-full', theme.bar)} />
      <span className="truncate">{label}</span>
    </div>
  );
}

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
    <span className="flex w-full min-w-0 items-center gap-2.5">
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

function CategoryFilterRow({
  name,
  count,
  selected,
  theme,
  onSelect,
}: {
  name: string;
  count: number;
  selected: boolean;
  theme: CategoryGroupTheme;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
        theme.item,
        selected && 'bg-accent/70',
      )}
      onPointerDown={(event) => {
        event.preventDefault();
        onSelect();
      }}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {selected ? <Check className="size-3.5" /> : null}
      </span>
      <CategoryFilterOption
        name={name}
        count={count}
        badgeClass={count === 0 ? theme.badgeEmpty : theme.badge}
        leading={
          <span className={cn('size-2 shrink-0 rounded-full', theme.dot)} />
        }
      />
    </button>
  );
}

type CategoryFilterComboboxProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  sections: AdminCategoryFilterSection[];
  productCountByCategoryId?: ReadonlyMap<number, number>;
  totalProductCount?: number;
  hideEmptyCategories?: boolean;
  className?: string;
  orphanSectionLabel?: string;
};

export function CategoryFilterCombobox({
  id,
  value,
  onValueChange,
  sections,
  productCountByCategoryId,
  totalProductCount,
  hideEmptyCategories = true,
  className,
  orphanSectionLabel = 'Ungrouped',
}: CategoryFilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const countForCategory = (categoryId: number) =>
    productCountByCategoryId?.get(categoryId) ?? 0;

  const allCategories = useMemo(
    () => flattenCategorySections(sections),
    [sections],
  );
  const groupThemeIndexById = useMemo(
    () => buildGroupThemeIndexById(sections),
    [sections],
  );
  const categoryById = useMemo(
    () => new Map(allCategories.map((category) => [category.id, category])),
    [allCategories],
  );

  const visibleSections = useMemo(() => {
    if (!hideEmptyCategories || showEmpty || !productCountByCategoryId) {
      return sections;
    }
    return sections
      .map((section) => ({
        ...section,
        categories: section.categories.filter(
          (category) => (productCountByCategoryId.get(category.id) ?? 0) > 0,
        ),
      }))
      .filter((section) => section.categories.length > 0);
  }, [sections, hideEmptyCategories, showEmpty, productCountByCategoryId]);

  const filteredSections = useMemo(
    () => filterCategorySections(visibleSections, filterText),
    [visibleSections, filterText],
  );

  const selectedLabel = useMemo(() => {
    if (value === 'all') return 'All categories';
    const parsedId = Number.parseInt(value, 10);
    if (Number.isNaN(parsedId)) return '';
    return categoryById.get(parsedId)?.name ?? '';
  }, [value, categoryById]);

  const showAllOption =
    !filterText.trim() ||
    'all categories'.includes(filterText.trim().toLowerCase());

  const closeDropdown = () => {
    setOpen(false);
    setIsEditing(false);
    setFilterText('');
  };

  const selectValue = (nextValue: string) => {
    onValueChange(nextValue);
    closeDropdown();
  };

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      closeDropdown();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    const el = dropdownRef.current;
    if (!open || !el) return;

    const handleWheel = (event: WheelEvent) => {
      event.stopPropagation();

      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight) return;

      const delta = event.deltaY;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if ((delta < 0 && !atTop) || (delta > 0 && !atBottom)) {
        event.preventDefault();
        el.scrollTop += delta;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () =>
      el.removeEventListener('wheel', handleWheel, { capture: true });
  }, [open, filteredSections, showAllOption]);

  const inputValue = open && isEditing ? filterText : selectedLabel;
  const hasHiddenEmpty =
    hideEmptyCategories &&
    !showEmpty &&
    productCountByCategoryId != null &&
    sections.some((section) =>
      section.categories.some((category) => countForCategory(category.id) === 0),
    );

  return (
    <div ref={containerRef} className={cn('relative min-w-[14rem]', className)}>
      <Input
        id={id}
        value={inputValue}
        placeholder="Search categories…"
        onFocus={() => setOpen(true)}
        onPointerDown={() => {
          if (open) {
            closeDropdown();
            return;
          }
          setOpen(true);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setIsEditing(true);
          setFilterText(nextQuery);
          setOpen(true);
        }}
        className="w-full min-w-[14rem] border-primary/25 bg-gradient-to-r from-primary/8 via-background to-background pr-8 shadow-sm transition-colors hover:border-primary/40 hover:from-primary/12 focus-visible:border-primary/40"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />

      {open ? (
        <div
          ref={dropdownRef}
          data-scroll-lock-scrollable=""
          className="absolute top-full left-0 z-50 mt-1 max-h-80 w-full min-w-[19rem] overflow-y-auto overscroll-contain rounded-xl border border-primary/10 bg-popover p-1.5 text-popover-foreground shadow-lg"
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          {showAllOption ? (
            <div className="px-1 pb-1">
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  ALL_CATEGORIES_THEME.item,
                  value === 'all' && 'bg-accent/70',
                )}
                onPointerDown={(event) => {
                  event.preventDefault();
                  selectValue('all');
                }}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {value === 'all' ? <Check className="size-3.5" /> : null}
                </span>
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
              </button>
              {filteredSections.length > 0 ? (
                <div className="my-1.5 h-px bg-border" />
              ) : null}
            </div>
          ) : null}

          {filteredSections.length === 0 && !showAllOption ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No matching categories.
            </p>
          ) : (
            filteredSections.map((section, sectionIndex) => {
              if (section.type === 'orphans') {
                return (
                  <div key="orphans" className="pb-1">
                    <CategoryGroupHeading
                      label={orphanSectionLabel}
                      theme={ORPHAN_CATEGORY_THEME}
                    />
                    <div className="space-y-0.5 px-1 py-1">
                      {section.categories.map((category) => (
                        <CategoryFilterRow
                          key={category.id}
                          name={category.name}
                          count={countForCategory(category.id)}
                          selected={value === String(category.id)}
                          theme={ORPHAN_CATEGORY_THEME}
                          onSelect={() => selectValue(String(category.id))}
                        />
                      ))}
                    </div>
                    {sectionIndex < filteredSections.length - 1 ? (
                      <div className="my-1.5 h-px bg-border" />
                    ) : null}
                  </div>
                );
              }

              const theme = categoryGroupTheme(
                groupThemeIndexById.get(section.groupId) ?? 0,
              );

              return (
                <div key={`group-${section.groupId}`} className="pb-1">
                  <CategoryGroupHeading
                    label={section.groupName}
                    theme={theme}
                  />
                  <div className="space-y-0.5 px-1 py-1">
                    {section.categories.map((category) => (
                      <CategoryFilterRow
                        key={category.id}
                        name={category.name}
                        count={countForCategory(category.id)}
                        selected={value === String(category.id)}
                        theme={theme}
                        onSelect={() => selectValue(String(category.id))}
                      />
                    ))}
                  </div>
                  {sectionIndex < filteredSections.length - 1 ? (
                    <div className="my-1.5 h-px bg-border" />
                  ) : null}
                </div>
              );
            })
          )}

          {hasHiddenEmpty ? (
            <div className="border-t px-2 py-1.5">
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                onPointerDown={(event) => {
                  event.preventDefault();
                  setShowEmpty((current) => !current);
                }}
              >
                {showEmpty ? 'Hide empty categories' : 'Show empty categories'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
