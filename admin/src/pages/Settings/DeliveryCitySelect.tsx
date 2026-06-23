import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  formatDeliveryCityLabel,
  filterDeliveryCityOptions,
  type DeliveryCityOption,
} from '@/lib/delivery-cities';
import { ChevronDown } from 'lucide-react';
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

type DeliveryCitySelectProps = {
  id: string;
  options: DeliveryCityOption[];
  selectedId: number | null;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  onSelect: (city: DeliveryCityOption) => void;
  onClear?: () => void;
};

export function DeliveryCitySelect({
  id,
  options,
  selectedId,
  disabled = false,
  loading = false,
  placeholder = 'Search city or postcode…',
  onSelect,
  onClear,
}: DeliveryCitySelectProps) {
  const selectedCity = useMemo(
    () => options.find((city) => city.id === selectedId) ?? null,
    [options, selectedId],
  );
  const selectedLabel = selectedCity ? formatDeliveryCityLabel(selectedCity) : '';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selectedLabel);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const matches = useMemo(
    () => filterDeliveryCityOptions(options, query, 12),
    [options, query],
  );

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
      setQuery(selectedLabel);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, selectedLabel]);

  const dropdown =
    open && !disabled && !loading && position
      ? createPortal(
          <div
            ref={dropdownRef}
            className="pointer-events-auto fixed z-[100] max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No matching cities.
              </p>
            ) : (
              matches.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-muted',
                    city.id === selectedId && 'bg-muted/70',
                  )}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    onSelect(city);
                    setQuery(formatDeliveryCityLabel(city));
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{formatDeliveryCityLabel(city)}</span>
                  {city.distanceKm != null ? (
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {city.distanceKm.toFixed(1)} km
                    </span>
                  ) : (
                    <span className="shrink-0 text-muted-foreground">No distance</span>
                  )}
                </button>
              ))
            )}
          </div>,
          document.body,
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
          placeholder={loading ? 'Loading cities…' : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setOpen(true);
            if (!nextQuery.trim()) {
              onClear?.();
            }
          }}
          className="h-8 pr-8 text-xs"
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
