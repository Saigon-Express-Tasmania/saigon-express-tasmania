import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SlidersHorizontal } from 'lucide-react';
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';

export type FilterSelectOption = {
  value: string;
  label: string;
};

export type FilterItem = {
  /** Form field key passed to `onApply`. */
  name: string;
  label: string;
  options: FilterSelectOption[];
  /** Value treated as unfiltered (default `"all"`). */
  emptyValue?: string;
};

export type FilterBoxProps = {
  items: FilterItem[];
  /** Currently applied filter values, keyed by `name`. */
  values: Record<string, string>;
  onApply: (values: Record<string, string>) => void;
  onReset: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  buttonLabel?: string;
  clearLabel?: string;
  applyLabel?: string;
  panelAriaLabel?: string;
};

function isSelectPortalNode(node: EventTarget): boolean {
  if (!(node instanceof Element)) return false;
  return Boolean(
    node.closest("[data-slot='select-content']") ||
      node.closest("[data-slot='select-item']") ||
      node.closest("[data-slot='select-viewport']"),
  );
}

function isInsideFilterBox(path: EventTarget[], root: HTMLDivElement | null): boolean {
  if (!root) return false;
  return path.some((node) => node instanceof Node && root.contains(node));
}

function isInsideSelectPortal(path: EventTarget[]): boolean {
  return path.some((node) => isSelectPortalNode(node));
}

function emptyValuesForItems(items: FilterItem[]): Record<string, string> {
  return Object.fromEntries(
    items.map((item) => [item.name, item.emptyValue ?? 'all']),
  );
}

function countActiveFilters(
  items: FilterItem[],
  values: Record<string, string>,
): number {
  return items.filter((item) => {
    const empty = item.emptyValue ?? 'all';
    const current = values[item.name];
    return current != null && current !== '' && current !== empty;
  }).length;
}

function FilterBoxInner({
  items,
  values,
  onApply,
  onReset,
  open: openProp,
  onOpenChange,
  title = 'Filters',
  buttonLabel = 'Filter',
  clearLabel = 'Clear',
  applyLabel = 'Apply',
  panelAriaLabel = 'Filters',
}: FilterBoxProps) {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const ignoreOutsideCloseRef = useRef(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    emptyValuesForItems(items),
  );

  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const activeFilterCount = useMemo(
    () => countActiveFilters(items, values),
    [items, values],
  );

  const hasActiveFilters = activeFilterCount > 0;

  useEffect(() => {
    if (!open) return;
    setDraft({ ...emptyValuesForItems(items), ...values });
  }, [open, items, values]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;

    ignoreOutsideCloseRef.current = true;
    const unlockId = window.requestAnimationFrame(() => {
      ignoreOutsideCloseRef.current = false;
    });

    const onPointerDown = (event: PointerEvent) => {
      if (ignoreOutsideCloseRef.current) return;

      const path = event.composedPath();
      if (isInsideFilterBox(path, rootRef.current)) return;
      if (isInsideSelectPortal(path)) return;

      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.cancelAnimationFrame(unlockId);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, setOpen]);

  const handleOpen = () => {
    ignoreOutsideCloseRef.current = true;
    setOpen(true);
  };

  const handleDraftChange = (name: string, value: string) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    onApply(draft);
  };

  const handleReset = () => {
    const cleared = emptyValuesForItems(items);
    setDraft(cleared);
    onReset();
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          hasActiveFilters
            ? `${buttonLabel} (${activeFilterCount} selected)`
            : buttonLabel
        }
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className={cn(
          'gap-2',
          hasActiveFilters &&
            'border-emerald-600/40 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white',
        )}
      >
        {hasActiveFilters ? (
          <span
            className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-white px-1 text-[11px] font-semibold leading-5 text-emerald-700"
            aria-hidden
          >
            {activeFilterCount}
          </span>
        ) : (
          <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
        )}
        {buttonLabel}
      </Button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={panelAriaLabel}
            className={cn(
              'z-50 flex w-[min(calc(100vw-2rem),18rem)] flex-col gap-4 rounded-lg border bg-card p-4 shadow-lg',
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'md:absolute md:top-full md:right-0 md:left-auto md:mt-2 md:translate-x-0 md:translate-y-0',
            )}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold">{title}</p>

            {items.map((item) => {
              const fieldId = `${baseId}-${item.name}`;
              const draftValue = draft[item.name] ?? item.emptyValue ?? 'all';
              return (
                <Field key={item.name}>
                  <FieldLabel htmlFor={fieldId}>{item.label}</FieldLabel>
                  <Select
                    value={draftValue}
                    onValueChange={(value) => handleDraftChange(item.name, value)}
                  >
                    <SelectTrigger id={fieldId} className="w-full">
                      <SelectValue placeholder={item.label} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[60]">
                      {item.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              );
            })}

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                {clearLabel}
              </Button>
              <Button type="button" size="sm" onClick={handleApply}>
                {applyLabel}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export const FilterBox = memo(FilterBoxInner);
