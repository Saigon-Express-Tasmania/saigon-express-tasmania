import { Field } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type PaginationNumber = number | 'ellipsis';

export type PaginationProps = {
  totalRecords: number;
  page: number;
  perPage: number;
  totalPages: number;
  perPageOptions?: number[];
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

function buildPageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount = 2,
): PaginationNumber[] {
  if (totalPages <= 0) return [];
  if (totalPages === 1) return [1];

  const pagesToShow = new Set<number>();
  pagesToShow.add(1);
  pagesToShow.add(totalPages);
  for (let i = currentPage - siblingCount; i <= currentPage + siblingCount; i += 1) {
    if (i >= 1 && i <= totalPages) pagesToShow.add(i);
  }

  const sorted = [...pagesToShow].sort((a, b) => a - b);
  const result: PaginationNumber[] = [];
  let previous: number | undefined;

  for (const pageNumber of sorted) {
    if (previous !== undefined && pageNumber - previous > 1) {
      result.push('ellipsis');
    }
    result.push(pageNumber);
    previous = pageNumber;
  }

  return result;
}

function siblingCountFromWidth(width: number): number {
  const pageSlotWidth = 34;
  const reservedWidth = 340;
  const budget = width - reservedWidth;
  if (budget < pageSlotWidth * 3) return 1;
  const maxSlots = Math.floor(budget / pageSlotWidth);
  const siblings = Math.floor((maxSlots - 4) / 2);
  return Math.min(5, Math.max(1, siblings));
}

export function Pagination({
  totalRecords,
  page,
  perPage,
  totalPages,
  perPageOptions = [10, 25, 50, 100],
  onPageChange,
  onPerPageChange,
}: PaginationProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [siblingCount, setSiblingCount] = useState(2);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || totalRecords <= 0) return;

    const update = () => {
      setSiblingCount(siblingCountFromWidth(bar.getBoundingClientRect().width));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [totalRecords]);

  const pageNumbers = useMemo(
    () => buildPageNumbers(page, totalPages, siblingCount),
    [page, totalPages, siblingCount],
  );

  if (totalRecords <= 0) return null;

  return (
    <div
      ref={barRef}
      className="flex flex-wrap items-end justify-between gap-3 text-sm text-muted-foreground"
    >
      <span className="py-2">
        {totalRecords} record{totalRecords === 1 ? '' : 's'}
      </span>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Select page">
        {pageNumbers.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`page-ellipsis-${index}`}
              className="px-1 text-muted-foreground"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={page === item ? 'default' : 'outline'}
              size="sm"
              className="min-w-8 rounded-full border-none px-2 shadow-none"
              aria-current={page === item ? 'page' : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}
      </nav>
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-18">
          <Select
            value={String(perPage)}
            onValueChange={(value) => {
              onPerPageChange(Number(value));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {perPageOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ArrowLeft />
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
