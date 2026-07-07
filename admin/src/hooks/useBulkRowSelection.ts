import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';

type UseBulkRowSelectionOptions<T extends { id: number }> = {
  /** Rows in display order (e.g. current page) used for shift-click range selection. */
  displayRows?: T[];
};

export function useBulkRowSelection<T extends { id: number }>(
  filteredRows: T[],
  options: UseBulkRowSelectionOptions<T> = {},
) {
  const displayRows = options.displayRows ?? filteredRows;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const anchorIdRef = useRef<number | null>(null);
  const shiftKeyRef = useRef(false);

  const selectedCount = selectedIds.size;

  const allFilteredSelected =
    displayRows.length > 0 && displayRows.every((row) => selectedIds.has(row.id));

  const someFilteredSelected =
    displayRows.some((row) => selectedIds.has(row.id)) && !allFilteredSelected;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected, displayRows.length]);

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

  const selectRange = (fromId: number, toId: number, checked: boolean) => {
    const orderedIds = displayRows.map((row) => row.id);
    const fromIndex = orderedIds.indexOf(fromId);
    const toIndex = orderedIds.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (let index = start; index <= end; index += 1) {
        const rowId = orderedIds[index];
        if (checked) {
          next.add(rowId);
        } else {
          next.delete(rowId);
        }
      }
      return next;
    });
  };

  const handleRowSelect = (id: number, checked: boolean, shiftKey: boolean) => {
    if (shiftKey && anchorIdRef.current != null && anchorIdRef.current !== id) {
      selectRange(anchorIdRef.current, id, checked);
      return;
    }

    toggleSelected(id, checked);
    anchorIdRef.current = id;
  };

  const onRowCheckboxPointerDown = (event: PointerEvent<HTMLInputElement>) => {
    shiftKeyRef.current = event.shiftKey;
  };

  const onRowCheckboxChange =
    (id: number) => (event: ChangeEvent<HTMLInputElement>) => {
      handleRowSelect(id, event.target.checked, shiftKeyRef.current);
      shiftKeyRef.current = false;
    };

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of displayRows) {
        if (checked) {
          next.add(row.id);
        } else {
          next.delete(row.id);
        }
      }
      return next;
    });
    if (checked && displayRows.length > 0) {
      anchorIdRef.current = displayRows[0]?.id ?? null;
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    anchorIdRef.current = null;
  };

  const removeFromSelection = (id: number) => {
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (anchorIdRef.current === id) {
      anchorIdRef.current = null;
    }
  };

  return {
    selectedIds,
    selectedCount,
    selectAllRef,
    allFilteredSelected,
    toggleSelected,
    handleRowSelect,
    onRowCheckboxPointerDown,
    onRowCheckboxChange,
    toggleSelectAllFiltered,
    clearSelection,
    removeFromSelection,
    setSelectedIds,
  };
}
