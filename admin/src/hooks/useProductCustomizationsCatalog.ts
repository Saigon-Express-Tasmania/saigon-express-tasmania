import {
  type ProductCustomizationsCatalog,
  type ProductCustomizationGroup,
} from '@/lib/order-item-customisation';
import supabase from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

type OptionRow = {
  key: string;
  title: string;
  sort_order: number;
};

type GroupRow = {
  id: number;
  key: string;
  product_customization_options?: OptionRow[] | null;
};

export function useProductCustomizationsCatalog() {
  const [catalog, setCatalog] = useState<ProductCustomizationsCatalog>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('product_customizations')
          .select(
            `
            id,
            key,
            product_customization_options (
              key,
              title,
              sort_order
            )
          `,
          )
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const next: ProductCustomizationsCatalog = {};
        for (const row of data ?? []) {
          const group = row as GroupRow;
          const options = [...(group.product_customization_options ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order || a.key.localeCompare(b.key),
          );
          next[group.id] = {
            id: group.id,
            key: group.key,
            options: options.map((option) => ({
              key: option.key,
              title: option.title,
            })),
          } satisfies ProductCustomizationGroup & { id: number };
        }
        setCatalog(next);
      } catch {
        if (!cancelled) setCatalog({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog, loading };
}
