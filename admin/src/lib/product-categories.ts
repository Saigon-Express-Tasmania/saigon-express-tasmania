import supabase from '@/lib/supabase/client';

const PRODUCT_ID_QUERY_BATCH_SIZE = 100;
const PRODUCT_CATEGORY_UPSERT_BATCH_SIZE = 400;
const PRIMARY_UPDATE_BATCH_SIZE = 50;

function chunkValues<T>(values: T[], batchSize: number): T[][] {
  if (values.length === 0) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += batchSize) {
    chunks.push(values.slice(index, index + batchSize));
  }
  return chunks;
}

async function runInParallelBatches<T>(
  items: T[],
  batchSize: number,
  handler: (batch: T[]) => Promise<void>,
): Promise<void> {
  await Promise.all(
    chunkValues(items, batchSize).map((batch) => handler(batch)),
  );
}

async function loadLegacyCategoryIdsByProductId(
  productIds: number[],
): Promise<Map<number, number | null>> {
  const legacyCategoryIdByProductId = new Map<number, number | null>();

  await runInParallelBatches(
    productIds,
    PRODUCT_ID_QUERY_BATCH_SIZE,
    async (batchIds) => {
      const { data, error } = await supabase
        .from('products')
        .select('id, category_id')
        .in('id', batchIds);

      if (error) throw error;

      for (const row of data ?? []) {
        legacyCategoryIdByProductId.set(
          Number(row.id),
          row.category_id != null ? Number(row.category_id) : null,
        );
      }
    },
  );

  return legacyCategoryIdByProductId;
}

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
  const uniqueProductIds = [...new Set(productIds.filter((id) => id > 0))];
  if (uniqueProductIds.length === 0) return byProductId;

  await runInParallelBatches(
    uniqueProductIds,
    PRODUCT_ID_QUERY_BATCH_SIZE,
    async (batchIds) => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('product_id, category_id, is_primary, sort_order')
        .in('product_id', batchIds)
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
    },
  );

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

export async function appendProductCategories(
  productIds: number[],
  categoryIdsToAdd: number[],
): Promise<void> {
  const uniqueCategoryIds = [
    ...new Set(categoryIdsToAdd.filter((categoryId) => categoryId > 0)),
  ];
  const uniqueProductIds = [...new Set(productIds.filter((productId) => productId > 0))];
  if (uniqueProductIds.length === 0 || uniqueCategoryIds.length === 0) return;

  const [existingByProductId, legacyCategoryIdByProductId] = await Promise.all([
    loadProductCategoriesByProductIds(uniqueProductIds),
    loadLegacyCategoryIdsByProductId(uniqueProductIds),
  ]);

  const rowsToInsert: Array<{
    product_id: number;
    category_id: number;
    is_primary: boolean;
    sort_order: number;
  }> = [];
  const primaryCategoryByProductId = new Map<number, number>();

  for (const productId of uniqueProductIds) {
    const assignments = existingByProductId.get(productId) ?? [];
    const legacyCategoryId = legacyCategoryIdByProductId.get(productId) ?? null;
    const existingCategoryIds = new Set(
      assignments.map((assignment) => assignment.categoryId),
    );
    if (legacyCategoryId != null) {
      existingCategoryIds.add(legacyCategoryId);
    }

    const hasPrimary =
      assignments.some((assignment) => assignment.isPrimary) ||
      legacyCategoryId != null;

    let maxSortOrder = assignments.reduce(
      (max, assignment) => Math.max(max, assignment.sortOrder),
      -1,
    );

    for (const categoryId of uniqueCategoryIds) {
      if (existingCategoryIds.has(categoryId)) continue;

      maxSortOrder += 1;
      rowsToInsert.push({
        product_id: productId,
        category_id: categoryId,
        is_primary: false,
        sort_order: maxSortOrder,
      });
      existingCategoryIds.add(categoryId);

      if (!hasPrimary && !primaryCategoryByProductId.has(productId)) {
        primaryCategoryByProductId.set(productId, categoryId);
      }
    }
  }

  if (rowsToInsert.length === 0) return;

  await runInParallelBatches(
    rowsToInsert,
    PRODUCT_CATEGORY_UPSERT_BATCH_SIZE,
    async (batchRows) => {
      const { error: insertError } = await supabase
        .from('product_categories')
        .upsert(batchRows, {
          onConflict: 'product_id,category_id',
          ignoreDuplicates: true,
        });

      if (insertError) throw insertError;
    },
  );

  const primaryUpdates = [...primaryCategoryByProductId.entries()];
  await runInParallelBatches(
    primaryUpdates,
    PRIMARY_UPDATE_BATCH_SIZE,
    async (batchUpdates) => {
      await Promise.all(
        batchUpdates.map(async ([productId, categoryId]) => {
          const { error: primaryError } = await supabase
            .from('product_categories')
            .update({ is_primary: true })
            .eq('product_id', productId)
            .eq('category_id', categoryId);

          if (primaryError) throw primaryError;
        }),
      );
    },
  );
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
