import supabase from '@/lib/supabase/client';

export type AdminCategoryOption = {
  id: number;
  name: string;
  kind: string;
};

export async function loadAdminCategoriesByKind(
  kind: 'menu' | 'wholesale' | 'catering',
): Promise<AdminCategoryOption[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, kind')
    .eq('kind', kind)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AdminCategoryOption[];
}
