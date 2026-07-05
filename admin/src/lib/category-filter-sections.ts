import supabase from '@/lib/supabase/client';
import type { AdminCategoryOption } from '@/lib/categories';

export type AdminCategoryGroupOption = {
  id: number;
  name: string;
  sortOrder: number;
};

export type AdminCategoryFilterSection =
  | { type: 'orphans'; categories: AdminCategoryOption[] }
  | {
      type: 'group';
      groupId: number;
      groupName: string;
      categories: AdminCategoryOption[];
    };

function sortCategories(
  a: AdminCategoryOption,
  b: AdminCategoryOption,
): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
}

function sortGroups(
  a: AdminCategoryGroupOption,
  b: AdminCategoryGroupOption,
): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
}

export function flattenAdminCategoryFilterSections(
  sections: AdminCategoryFilterSection[],
): AdminCategoryOption[] {
  return sections.flatMap((section) => section.categories);
}

export function countProductsByCategoryId(
  products: readonly { categoryIds: number[] }[],
): ReadonlyMap<number, number> {
  const counts = new Map<number, number>();

  for (const product of products) {
    for (const categoryId of product.categoryIds) {
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    }
  }

  return counts;
}

export function buildAdminCategoryFilterSections(
  categories: AdminCategoryOption[],
  groups: AdminCategoryGroupOption[],
): AdminCategoryFilterSection[] {
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const orphans: AdminCategoryOption[] = [];
  const categoriesByGroupId = new Map<number, AdminCategoryOption[]>();

  for (const category of categories) {
    const groupId = category.categoryGroupId;
    if (groupId != null && groupsById.has(groupId)) {
      const existing = categoriesByGroupId.get(groupId) ?? [];
      existing.push(category);
      categoriesByGroupId.set(groupId, existing);
    } else {
      orphans.push(category);
    }
  }

  const sections: AdminCategoryFilterSection[] = [];

  if (orphans.length > 0) {
    sections.push({
      type: 'orphans',
      categories: [...orphans].sort(sortCategories),
    });
  }

  for (const group of [...groups].sort(sortGroups)) {
    const groupedCategories = categoriesByGroupId.get(group.id);
    if (!groupedCategories?.length) continue;

    sections.push({
      type: 'group',
      groupId: group.id,
      groupName: group.name,
      categories: [...groupedCategories].sort(sortCategories),
    });
  }

  return sections;
}

export async function loadAdminCategoryFilterSections(
  kind: 'menu' | 'wholesale' | 'catering',
): Promise<AdminCategoryFilterSection[]> {
  const [categoriesResult, groupsResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, kind, category_group_id, sort_order')
      .eq('kind', kind)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('category_groups')
      .select('id, name, sort_order')
      .eq('kind', kind)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (groupsResult.error) throw groupsResult.error;

  const categories = (categoriesResult.data ?? []).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    kind: String(row.kind),
    categoryGroupId:
      row.category_group_id != null ? Number(row.category_group_id) : null,
    sortOrder: Number(row.sort_order ?? 0),
  }));

  const groups = (groupsResult.data ?? []).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
  }));

  return buildAdminCategoryFilterSections(categories, groups);
}
