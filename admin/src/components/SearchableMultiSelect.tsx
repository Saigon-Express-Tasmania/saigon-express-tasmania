import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SearchableMultiSelectOption = {
  value: string;
  label: string;
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

type SearchableMultiSelectProps = {
  id?: string;
  options: SearchableMultiSelectOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function SearchableMultiSelect({
  id,
  options,
  values,
  onValuesChange,
  disabled = false,
  placeholder = 'Search and select…',
  className,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const optionByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );

  const selectedOptions = useMemo(
    () =>
      values
        .map((value) => optionByValue.get(value))
        .filter((option): option is SearchableMultiSelectOption => option != null),
    [values, optionByValue],
  );

  const matches = useMemo(() => {
    const term = filterText.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(term),
    );
  }, [options, filterText]);

  const closeDropdown = () => {
    setOpen(false);
    setFilterText('');
  };

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onValuesChange(values.filter((v) => v !== value));
      return;
    }
    onValuesChange([...values, value]);
  };

  const removeValue = (value: string) => {
    onValuesChange(values.filter((v) => v !== value));
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
  }, [open, filterText, selectedOptions.length]);

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
  }, [open, matches.length, position]);

  const dropdown =
    open && !disabled && position
      ? createPortal(
          <div
            ref={dropdownRef}
            data-scroll-lock-scrollable=""
            className="pointer-events-auto fixed z-[200] max-h-60 overflow-y-auto overscroll-contain rounded-md border bg-popover text-popover-foreground shadow-md"
            style={{
              top: position.top,
              left: position.left,
              width:  position.width,
            }}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No matching options.
              </p>
            ) : (
              matches.map((option) => {
                const selected = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted',
                      selected && 'bg-muted/70',
                    )}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      toggleValue(option.value);
                    }}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-sm border',
                        selected && 'border-primary bg-primary text-primary-foreground',
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={containerRef} className={cn('space-y-2', className)}>
        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedOptions.map((option) => (
              <Badge
                key={option.value}
                variant="secondary"
                className="gap-1 pr-1 font-normal"
              >
                {option.label}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                  disabled={disabled}
                  aria-label={`Remove ${option.label}`}
                  onClick={() => removeValue(option.value)}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="relative">
          <Input
            ref={inputRef}
            id={id}
            value={filterText}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setFilterText(event.target.value);
              setOpen(true);
            }}
            className="w-full pr-8"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
          />
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      {dropdown}
    </>
  );
}
