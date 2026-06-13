import supabase from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export type SalesOrderStoreLocation = {
  id: number;
  name: string;
  address: string;
  suburb: string | null;
  phone: string | null;
  hours: string | null;
};

export function formatSalesOrderStoreLocation(
  store: SalesOrderStoreLocation,
): string {
  const locality = [store.address, store.suburb].filter(Boolean).join(', ');
  return [store.name, locality].filter(Boolean).join(' — ');
}

export function useSalesOrderStoreLocations() {
  const [stores, setStores] = useState<SalesOrderStoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: queryError } = await supabase
          .from('store_locations')
          .select('id, name, address, suburb, phone, hours')
          .order('id', { ascending: true });

        if (queryError) throw queryError;
        if (!cancelled) {
          setStores((data ?? []) as SalesOrderStoreLocation[]);
        }
      } catch (err) {
        if (!cancelled) {
          setStores([]);
          setError(err instanceof Error ? err.message : 'Failed to load stores.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stores, loading, error };
}
