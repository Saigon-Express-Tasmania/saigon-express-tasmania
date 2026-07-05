import supabase from '@/lib/supabase/client';

export type AdminCategoryOption = {
  id: number;
  name: string;
  kind: string;
  categoryGroupId: number | null;
  sortOrder: number;
};

export async function loadAdminCategoriesByKind(
  kind: 'menu' | 'wholesale' | 'catering',
): Promise<AdminCategoryOption[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, kind, category_group_id, sort_order')
    .eq('kind', kind)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    kind: String(row.kind),
    categoryGroupId:
      row.category_group_id != null ? Number(row.category_group_id) : null,
    sortOrder: Number(row.sort_order ?? 0),
  }));
}
