import supabase from '@/lib/supabase/client';

export type ProductType = 'alacarte' | 'wholesale' | 'catering';

/** PostgREST default max rows per request. */
export const PRODUCT_TABLE_MAX_PER_PAGE = 1000;

export const PRODUCT_TABLE_PER_PAGE_OPTIONS = [
  20,
  50,
  100,
  250,
  500,
  PRODUCT_TABLE_MAX_PER_PAGE,
] as const;

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
