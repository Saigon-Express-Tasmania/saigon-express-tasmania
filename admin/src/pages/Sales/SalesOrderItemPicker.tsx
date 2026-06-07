import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  filterCatalogOptions,
  type SalesOrderCatalogOption,
} from './salesOrderCatalog';

export function isSalesOrderItemPickerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-sales-order-item-picker]') !== null;
}

type SalesOrderItemPickerProps = {
  id: string;
  options: SalesOrderCatalogOption[];
  selectedId: number;
  selectedName: string;
  disabled?: boolean;
  loading?: boolean;
  onSelect: (option: SalesOrderCatalogOption) => void;
};

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

function getPickerPortalContainer(): HTMLElement {
  // Radix modal dialogs mark body-level siblings as inert; portal inside the dialog
  // portal so the dropdown receives pointer events and hover styles.
  return document.querySelector('[data-slot="dialog-portal"]') ?? document.body;
}

export function SalesOrderItemPicker({
  id,
  options,
  selectedId,
  selectedName,
  disabled = false,
  loading = false,
  onSelect,
}: SalesOrderItemPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selectedName);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selectedName);
  }, [selectedId, selectedName]);

  const matches = useMemo(() => filterCatalogOptions(options, query, 10), [options, query]);

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
  }, [open, query]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const dropdown =
    open && !disabled && !loading && position
      ? createPortal(
          <div
            ref={dropdownRef}
            data-sales-order-item-picker
            className="pointer-events-auto fixed z-[100] max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matching items.</p>
            ) : (
              matches.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted',
                    option.id === selectedId && 'bg-muted/70',
                  )}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    onSelect(option);
                    setQuery(option.name);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{option.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">#{option.id}</span>
                </button>
              ))
            )}
          </div>,
          getPickerPortalContainer(),
        )
      : null;

  return (
    <>
      <div ref={containerRef} className="relative min-w-[220px]">
        <Input
          ref={inputRef}
          id={id}
          value={query}
          disabled={disabled || loading}
          placeholder={loading ? 'Loading items…' : 'Search items…'}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          className="h-9"
          autoComplete="off"
        />
      </div>
      {dropdown}
    </>
  );
}
