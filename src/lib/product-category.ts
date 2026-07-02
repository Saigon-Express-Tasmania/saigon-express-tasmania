import type { SiteCategory } from "@/types";

export type CategoryLookup = Pick<SiteCategory, "id" | "name" | "alias">;

export function categoryMapById(
  categories: CategoryLookup[],
): Map<number, CategoryLookup> {
  return new Map(categories.map((category) => [category.id, category]));
}

export function resolveCategoryName(
  categoryId: number | null | undefined,
  byId: Map<number, Pick<CategoryLookup, "name">>,
  fallback = "",
): string {
  if (categoryId == null) return fallback;
  return byId.get(categoryId)?.name ?? fallback;
}
