import supabase from '@/lib/supabase/client';

export type ProductType = 'alacarte' | 'wholesale' | 'catering';

export async function nextProductId(productType: ProductType): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('product_type', productType)
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxId = data?.[0]?.id ?? 0;
  return Number(maxId) + 1;
}
