import { useEffect, useMemo, useState } from 'react';

type UseTablePaginationOptions = {
  defaultPerPage?: number;
  perPageOptions?: number[];
};

export function useTablePagination<T>(
  items: T[],
  resetKey: unknown,
  options: UseTablePaginationOptions = {},
) {
  const { defaultPerPage = 25, perPageOptions = [10, 25, 50, 100] } = options;
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  const totalRecords = items.length;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalRecords / perPage)),
    [totalRecords, perPage],
  );

  useEffect(() => {
    setPage(1);
  }, [resetKey, perPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    if (totalRecords === 0) return [];
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage, totalRecords]);

  const onPerPageChange = (nextPerPage: number) => {
    setPerPage(nextPerPage);
    setPage(1);
  };

  return {
    paginatedItems,
    page,
    perPage,
    totalPages,
    totalRecords,
    perPageOptions,
    setPage,
    onPerPageChange,
  };
}
