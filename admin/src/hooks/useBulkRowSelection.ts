import { useEffect, useRef, useState } from 'react';

export function useBulkRowSelection<T extends { id: number }>(filteredRows: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const selectedCount = selectedIds.size;

  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedIds.has(row.id));

  const someFilteredSelected =
    filteredRows.some((row) => selectedIds.has(row.id)) && !allFilteredSelected;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected, filteredRows.length]);

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of filteredRows) {
        if (checked) {
          next.add(row.id);
        } else {
          next.delete(row.id);
        }
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const removeFromSelection = (id: number) => {
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return {
    selectedIds,
    selectedCount,
    selectAllRef,
    allFilteredSelected,
    toggleSelected,
    toggleSelectAllFiltered,
    clearSelection,
    removeFromSelection,
    setSelectedIds,
  };
}
