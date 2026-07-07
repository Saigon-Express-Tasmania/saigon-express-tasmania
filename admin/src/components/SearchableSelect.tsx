import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SearchableSelectOption = {
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

type SearchableSelectProps = {
  id?: string;
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyOption?: SearchableSelectOption;
  className?: string;
};

export function SearchableSelect({
  id,
  options,
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Search…',
  emptyOption = { value: '', label: 'None' },
  className,
}: SearchableSelectProps) {
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );
  const selectedLabel = selectedOption?.label ?? '';

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allOptions = useMemo(() => {
    if (emptyOption.value === '' || !options.some((o) => o.value === emptyOption.value)) {
      return [emptyOption, ...options];
    }
    return options;
  }, [emptyOption, options]);

  const matches = useMemo(() => {
    const term = (isEditing ? filterText : '').trim().toLowerCase();
    if (!term) return allOptions;
    return allOptions.filter((option) =>
      option.label.toLowerCase().includes(term),
    );
  }, [allOptions, filterText, isEditing]);

  const inputValue = open && isEditing ? filterText : selectedLabel;

  const closeDropdown = () => {
    setOpen(false);
    setIsEditing(false);
    setFilterText('');
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
  }, [open, filterText, isEditing]);

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
    return () => {
      el.removeEventListener('wheel', handleWheel, { capture: true });
    };
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
              width: position.width,
            }}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No matching options.
              </p>
            ) : (
              matches.map((option) => (
                <button
                  key={option.value || '__empty__'}
                  type="button"
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted',
                    option.value === value && 'bg-muted/70',
                  )}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    onValueChange(option.value);
                    closeDropdown();
                  }}
                >
                  {option.label}
                </button>
              ))
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
            const nextQuery = event.target.value;
            setIsEditing(true);
            setFilterText(nextQuery);
            setOpen(true);
            if (!nextQuery.trim()) {
              onValueChange(emptyOption.value);
            }
          }}
          className="w-full pr-8"
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
