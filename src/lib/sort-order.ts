export function moveZeroSortOrderToEnd<T>(
  items: T[],
  getSortOrder: (item: T) => number | null | undefined,
): T[] {
  const ordered: T[] = [];
  const unsorted: T[] = [];

  for (const item of items) {
    if ((getSortOrder(item) ?? 0) === 0) {
      unsorted.push(item);
    } else {
      ordered.push(item);
    }
  }

  if (unsorted.length === 0) return items;
  return [...ordered, ...unsorted];
}
