export type CategoryDisplaySortable = {
  name: string;
  sortOrder: number;
};

/** Zero sort order is treated as unset and sorts after explicit values. */
export function categoryDisplaySortRank(sortOrder: number): number {
  return sortOrder === 0 ? Number.MAX_SAFE_INTEGER : sortOrder;
}

export function compareCategoriesByDisplayOrder<
  T extends CategoryDisplaySortable,
>(a: T, b: T): number {
  const rankDiff =
    categoryDisplaySortRank(a.sortOrder) -
    categoryDisplaySortRank(b.sortOrder);
  if (rankDiff !== 0) return rankDiff;
  return a.name.localeCompare(b.name);
}

export function sortCategoriesByDisplayOrder<T extends CategoryDisplaySortable>(
  categories: T[],
): T[] {
  return [...categories].sort(compareCategoriesByDisplayOrder);
}
