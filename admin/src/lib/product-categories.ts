import supabase from '@/lib/supabase/client';

export type ProductCategoryAssignment = {
  categoryId: number;
  isPrimary: boolean;
  sortOrder: number;
};

export type ProductCategoriesByProductId = Map<
  number,
  ProductCategoryAssignment[]
>;

export async function loadProductCategoriesByProductIds(
  productIds: number[],
): Promise<ProductCategoriesByProductId> {
  const byProductId: ProductCategoriesByProductId = new Map();
  if (productIds.length === 0) return byProductId;

  const { data, error } = await supabase
    .from('product_categories')
    .select('product_id, category_id, is_primary, sort_order')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true })
    .order('category_id', { ascending: true });

  if (error) throw error;

  for (const row of data ?? []) {
    const productId = Number(row.product_id);
    const assignments = byProductId.get(productId) ?? [];
    assignments.push({
      categoryId: Number(row.category_id),
      isPrimary: Boolean(row.is_primary),
      sortOrder: Number(row.sort_order ?? 0),
    });
    byProductId.set(productId, assignments);
  }

  return byProductId;
}

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

export function resolvePrimaryCategoryId(
  categoryIds: number[],
  primaryCategoryId: number | null,
): number | null {
  const uniqueIds = [...new Set(categoryIds.filter((id) => id > 0))];
  if (uniqueIds.length === 0) return null;
  if (
    primaryCategoryId != null &&
    uniqueIds.includes(primaryCategoryId)
  ) {
    return primaryCategoryId;
  }
  return uniqueIds[0] ?? null;
}

export async function syncProductCategories(
  productId: number,
  categoryIds: number[],
  primaryCategoryId: number | null,
  sortOrderBase = 0,
): Promise<void> {
  const uniqueIds = [...new Set(categoryIds.filter((id) => id > 0))];
  const resolvedPrimary = resolvePrimaryCategoryId(
    uniqueIds,
    primaryCategoryId,
  );

  const { error: deleteError } = await supabase
    .from('product_categories')
    .delete()
    .eq('product_id', productId);

  if (deleteError) throw deleteError;

  if (uniqueIds.length === 0) {
    const { error: clearPrimaryError } = await supabase
      .from('products')
      .update({ category_id: null })
      .eq('id', productId);
    if (clearPrimaryError) throw clearPrimaryError;
    return;
  }

  const rows = uniqueIds.map((categoryId, index) => ({
    product_id: productId,
    category_id: categoryId,
    is_primary: categoryId === resolvedPrimary,
    sort_order: sortOrderBase + index,
  }));

  const { error: insertError } = await supabase
    .from('product_categories')
    .insert(rows);

  if (insertError) throw insertError;

  const { error: setPrimaryError } = await supabase
    .from('products')
    .update({ category_id: resolvedPrimary })
    .eq('id', productId);

  if (setPrimaryError) throw setPrimaryError;
}

export function attachProductCategoryFields<
  T extends { id: number; category_id?: number | null },
>(
  rows: T[],
  byProductId: ProductCategoriesByProductId,
): (T & { categoryIds: number[]; primaryCategoryId: number | null })[] {
  return rows.map((row) => {
    const assignments = byProductId.get(row.id) ?? [];
    if (assignments.length === 0 && row.category_id != null) {
      const legacyCategoryId = Number(row.category_id);
      return {
        ...row,
        categoryIds: [legacyCategoryId],
        primaryCategoryId: legacyCategoryId,
      };
    }
    return {
      ...row,
      categoryIds: getCategoryIdsOrdered(assignments),
      primaryCategoryId: getPrimaryCategoryId(assignments),
    };
  });
}
