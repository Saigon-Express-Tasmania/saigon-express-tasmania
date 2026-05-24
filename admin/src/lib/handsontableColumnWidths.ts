/** Minimum column width (px) when restoring persisted values */
const MIN_COL_WIDTH = 40;

/**
 * Merge persisted column widths with defaults (handles missing keys, wrong length, bad values).
 */
export function mergeColumnWidths(
  defaults: readonly number[],
  persisted: number[] | undefined | null,
): number[] {
  if (!persisted || persisted.length !== defaults.length) {
    return [...defaults];
  }
  return persisted.map((w, i) =>
    typeof w === 'number' && Number.isFinite(w) && w >= MIN_COL_WIDTH
      ? w
      : defaults[i],
  );
}

export function textColumnsFromWidths(widths: number[]) {
  return widths.map((width) => ({ type: 'text' as const, width }));
}
