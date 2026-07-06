import { Input } from '@/components/ui/input';
import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import {
  buildGroupThemeIndexById,
  categoryGroupTheme,
  filterCategorySections,
  flattenCategorySections,
  ORPHAN_CATEGORY_THEME,
  type CategoryGroupTheme,
} from '@/lib/category-select-themes';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

function updateDropdownPosition(input: HTMLInputElement): DropdownPosition {
  const rect = input.getBoundingClientRect();
  return {
    top: rect.bottom + 4,
    left: rect.left,
    width: rect.width,
  };
}

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

function CategorySelectRow({
  name,
  selected,
  theme,
  onSelect,
}: {
  name: string;
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
      <span className={cn('size-2 shrink-0 rounded-full', theme.dot)} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
    </button>
  );
}

type GroupedCategorySelectProps = {
  id?: string;
  sections: AdminCategoryFilterSection[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyOptionLabel?: string;
  className?: string;
  orphanSectionLabel?: string;
  selectedLabelById?: ReadonlyMap<number, string>;
};

export function GroupedCategorySelect({
  id,
  sections,
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Search categories…',
  emptyOptionLabel = 'None',
  className,
  orphanSectionLabel = 'Ungrouped',
  selectedLabelById,
}: GroupedCategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const filteredSections = useMemo(
    () => filterCategorySections(sections, filterText),
    [sections, filterText],
  );

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const parsedId = Number.parseInt(value, 10);
    if (Number.isNaN(parsedId)) return '';
    return (
      selectedLabelById?.get(parsedId) ??
      categoryById.get(parsedId)?.name ??
      ''
    );
  }, [value, selectedLabelById, categoryById]);

  const showEmptyOption =
    !filterText.trim() ||
    emptyOptionLabel.toLowerCase().includes(filterText.trim().toLowerCase());

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
    if (!open || !inputRef.current) {
      setPosition(null);
      return;
    }

    const syncPosition = () => {
      if (!inputRef.current) return;
      setPosition(updateDropdownPosition(inputRef.current));
    };

    syncPosition();
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);
    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [open, filterText, isEditing, selectedLabel]);

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
  }, [open, filteredSections, position, showEmptyOption]);

  const inputValue = open && isEditing ? filterText : selectedLabel;

  const dropdown =
    open && !disabled && position
      ? createPortal(
          <div
            ref={dropdownRef}
            data-scroll-lock-scrollable=""
            className="pointer-events-auto fixed z-[200] max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-primary/10 bg-popover p-1.5 text-popover-foreground shadow-lg"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            {showEmptyOption ? (
              <div className="px-1 pb-1">
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    ORPHAN_CATEGORY_THEME.item,
                    !value && 'bg-accent/70',
                  )}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    selectValue('');
                  }}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {!value ? <Check className="size-3.5" /> : null}
                  </span>
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      ORPHAN_CATEGORY_THEME.dot,
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {emptyOptionLabel}
                  </span>
                </button>
                {filteredSections.length > 0 ? (
                  <div className="my-1.5 h-px bg-border" />
                ) : null}
              </div>
            ) : null}

            {filteredSections.length === 0 && !showEmptyOption ? (
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
                          <CategorySelectRow
                            key={category.id}
                            name={category.name}
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
                        <CategorySelectRow
                          key={category.id}
                          name={category.name}
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
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={containerRef} className={cn('relative w-full', className)}>
        <Input
          ref={inputRef}
          id={id}
          value={inputValue}
          disabled={disabled}
          placeholder={selectedLabel || placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setIsEditing(true);
            setFilterText(nextQuery);
            setOpen(true);
            if (!nextQuery.trim()) {
              onValueChange('');
            }
          }}
          className="w-full border-primary/25 bg-gradient-to-r from-primary/8 via-background to-background pr-8 shadow-sm transition-colors hover:border-primary/40 hover:from-primary/12 focus-visible:border-primary/40"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {dropdown}
    </>
  );
}
