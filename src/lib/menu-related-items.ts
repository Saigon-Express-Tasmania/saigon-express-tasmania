import type { MenuItem } from "@/contexts/CartContext";

const DEFAULT_RELATED_LIMIT = 4;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein edit distance. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[] = new Array(rows * cols);

  for (let i = 0; i < rows; i++) matrix[i * cols] = i;
  for (let j = 0; j < cols; j++) matrix[j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const del = matrix[(i - 1) * cols + j] + 1;
      const ins = matrix[i * cols + (j - 1)] + 1;
      const sub = matrix[(i - 1) * cols + (j - 1)] + cost;
      matrix[i * cols + j] = Math.min(del, ins, sub);
    }
  }

  return matrix[(rows - 1) * cols + (cols - 1)];
}

/** 0–1 score; higher means closer match. */
function fuzzyNameSimilarity(a: string, b: string): number {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const distance = levenshtein(left, right);
  const maxLen = Math.max(left.length, right.length);
  return 1 - distance / maxLen;
}

/**
 * Same-category items with the most similar names to `item` (fuzzy match).
 */
export function getRelatedMenuItems(
  item: MenuItem,
  menuItems: MenuItem[],
  limit = DEFAULT_RELATED_LIMIT,
): MenuItem[] {
  const itemName = normalizeName(item.name);

  return menuItems
    .filter(
      (m) =>
        m.category === item.category && normalizeName(m.name) !== itemName,
    )
    .map((m) => ({
      item: m,
      score: fuzzyNameSimilarity(item.name, m.name),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.name.localeCompare(b.item.name);
    })
    .slice(0, limit)
    .map(({ item: related }) => related);
}
