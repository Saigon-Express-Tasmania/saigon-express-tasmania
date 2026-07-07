import { Input } from '@/components/ui/input';
import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import {
  buildCategoryThemeById,
  buildGroupThemeIndexById,
  categoryGroupTheme,
  filterCategorySections,
  flattenCategorySections,
  ORPHAN_CATEGORY_THEME,
  type CategoryGroupTheme,
} from '@/lib/category-select-themes';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';
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

function CategoryMultiSelectRow({
  name,
  selected,
  theme,
  onToggle,
}: {
  name: string;
  selected: boolean;
  theme: CategoryGroupTheme;
  onToggle: () => void;
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
        onToggle();
      }}
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-sm border',
          selected ? theme.checkbox : 'border-input bg-background',
        )}
      >
        {selected ? <Check className="size-3" /> : null}
      </span>
      <span className={cn('size-2 shrink-0 rounded-full', theme.dot)} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
    </button>
  );
}

type GroupedCategoryMultiSelectProps = {
  id?: string;
  sections: AdminCategoryFilterSection[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  orphanSectionLabel?: string;
};

export function GroupedCategoryMultiSelect({
  id,
  sections,
  values,
  onValuesChange,
  disabled = false,
  placeholder = 'Search categories…',
  className,
  orphanSectionLabel = 'Ungrouped',
}: GroupedCategoryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const allCategories = useMemo(
    () => flattenCategorySections(sections),
    [sections],
  );
  const themeById = useMemo(() => buildCategoryThemeById(sections), [sections]);
  const groupThemeIndexById = useMemo(
    () => buildGroupThemeIndexById(sections),
    [sections],
  );
  const categoryById = useMemo(
    () => new Map(allCategories.map((category) => [category.id, category])),
    [allCategories],
  );

  const filteredSections = useMemo(
    () => filterCategorySections(sections, filterText),
    [sections, filterText],
  );

  const selectedCategories = useMemo(
    () =>
      values
        .map((value) => categoryById.get(Number(value)))
        .filter((category) => category != null),
    [values, categoryById],
  );

  const closeDropdown = () => {
    setOpen(false);
    setFilterText('');
  };

  const toggleValue = (value: string) => {
    const current = valuesRef.current;
    if (current.includes(value)) {
      onValuesChange(current.filter((entry) => entry !== value));
      return;
    }
    onValuesChange([...current, value]);
  };

  const removeValue = (value: string) => {
    onValuesChange(valuesRef.current.filter((entry) => entry !== value));
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
  }, [open, filteredSections]);

  const dropdownList =
    filteredSections.length === 0 ? (
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
                  <CategoryMultiSelectRow
                    key={category.id}
                    name={category.name}
                    selected={values.includes(String(category.id))}
                    theme={ORPHAN_CATEGORY_THEME}
                    onToggle={() => toggleValue(String(category.id))}
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
            <CategoryGroupHeading label={section.groupName} theme={theme} />
            <div className="space-y-0.5 px-1 py-1">
              {section.categories.map((category) => (
                <CategoryMultiSelectRow
                  key={category.id}
                  name={category.name}
                  selected={values.includes(String(category.id))}
                  theme={theme}
                  onToggle={() => toggleValue(String(category.id))}
                />
              ))}
            </div>
            {sectionIndex < filteredSections.length - 1 ? (
              <div className="my-1.5 h-px bg-border" />
            ) : null}
          </div>
        );
      })
    );

  return (
    <div ref={containerRef} className={cn('space-y-2', className)}>
      {selectedCategories.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedCategories.map((category) => {
            const theme = themeById.get(category.id) ?? ORPHAN_CATEGORY_THEME;
            return (
              <span
                key={category.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
                  theme.chip,
                )}
              >
                <span className={cn('size-1.5 rounded-full', theme.dot)} />
                {category.name}
                <button
                  type="button"
                  className="rounded-full p-0.5 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                  disabled={disabled}
                  aria-label={`Remove ${category.name}`}
                  onClick={() => removeValue(String(category.id))}
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
      <div className="relative">
        <Input
          id={id}
          value={filterText}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onPointerDown={() => {
            if (!disabled) {
              if (open) {
                closeDropdown();
                return;
              }
              setOpen(true);
            }
          }}
          onChange={(event) => {
            setFilterText(event.target.value);
            setOpen(true);
          }}
          className="w-full border-primary/25 bg-gradient-to-r from-primary/8 via-background to-background pr-8 shadow-sm transition-colors hover:border-primary/40 hover:from-primary/12 focus-visible:border-primary/40"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
        {open && !disabled ? (
          <div
            ref={dropdownRef}
            data-scroll-lock-scrollable=""
            className="absolute top-full left-0 z-50 mt-1 max-h-96 w-full overflow-y-auto overscroll-contain rounded-xl border border-primary/10 bg-popover p-1.5 text-popover-foreground shadow-lg"
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            {dropdownList}
          </div>
        ) : null}
      </div>
    </div>
  );
}
