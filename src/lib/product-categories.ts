import { resolveCategoryName, type CategoryLookup } from "@/lib/product-category";

export type ProductCategoryAssignment = {
  categoryId: number;
  isPrimary: boolean;
  sortOrder: number;
};

export type ProductCategoriesByProductId = Map<
  number,
  ProductCategoryAssignment[]
>;

export function getPrimaryCategoryId(
  assignments: ProductCategoryAssignment[],
): number | null {
  const primary = assignments.find((assignment) => assignment.isPrimary);
  if (primary) return primary.categoryId;
  return assignments[0]?.categoryId ?? null;
}

export function getCategoryIdsOrdered(
  assignments: ProductCategoryAssignment[],
): number[] {
  return [...assignments]
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.categoryId - b.categoryId,
    )
    .map((assignment) => assignment.categoryId);
}

export function resolveProductCategoryIds(
  assignments: ProductCategoryAssignment[],
): number[] {
  return getCategoryIdsOrdered(assignments);
}

export function productMatchesCategory(
  item: { categoryId?: number | null; categoryIds?: number[] },
  categoryId: number | null,
): boolean {
  if (categoryId == null) return true;
  if (item.categoryIds?.includes(categoryId)) return true;
  return item.categoryId === categoryId;
}

export function getProductCategoryAssignments(
  byProductId: ProductCategoriesByProductId,
  productId: number,
): ProductCategoryAssignment[] {
  return byProductId.get(productId) ?? [];
}

export function resolveProductCategoryLabel(
  assignments: ProductCategoryAssignment[],
  categoryById: Map<number, CategoryLookup>,
  fallback = "",
): string {
  const categoryIds = resolveProductCategoryIds(assignments);
  if (categoryIds.length === 0) return fallback;

  const labels = categoryIds
    .map((categoryId) => resolveCategoryName(categoryId, categoryById, ""))
    .filter(Boolean);

  if (labels.length > 0) return labels.join(", ");
  return fallback;
}
