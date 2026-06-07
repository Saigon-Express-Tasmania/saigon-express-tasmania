import supabase from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { OrderType } from './orderType';

export type SalesOrderCatalogOption = {
  id: number;
  name: string;
  unitPrice: number;
};

export function getOrderItemIdColumnLabel(orderType: OrderType): string {
  if (orderType === 'wholesale') return 'Wholesale Item ID';
  if (orderType === 'pickup' || orderType === 'delivery') return 'Menu Item ID';
  return 'Menu Item ID';
}

export function usesWholesaleCatalog(orderType: OrderType): boolean {
  return orderType === 'wholesale';
}

async function fetchMenuCatalog(): Promise<SalesOrderCatalogOption[]> {
  const { data, error } = await supabase
    .from('menu')
    .select('id, name, price')
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? '').trim(),
    unitPrice: Number.parseFloat(String(row.price ?? '0')) || 0,
  }));
}

async function fetchWholesaleCatalog(): Promise<SalesOrderCatalogOption[]> {
  const { data, error } = await supabase
    .from('wholesale_products')
    .select('id, name, unit_price')
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? '').trim(),
    unitPrice: Number(row.unit_price ?? 0) || 0,
  }));
}

export async function fetchSalesOrderCatalog(
  orderType: OrderType,
): Promise<SalesOrderCatalogOption[]> {
  return usesWholesaleCatalog(orderType)
    ? fetchWholesaleCatalog()
    : fetchMenuCatalog();
}

export function filterCatalogOptions(
  options: SalesOrderCatalogOption[],
  query: string,
  limit = 10,
): SalesOrderCatalogOption[] {
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? options.filter(
        (option) =>
          option.name.toLowerCase().includes(normalized) ||
          String(option.id).includes(normalized),
      )
    : options;

  return filtered.slice(0, limit);
}

export function useSalesOrderCatalog(orderType: OrderType | null) {
  const [options, setOptions] = useState<SalesOrderCatalogOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderType) {
      setOptions([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      if (!orderType) return;
      setLoading(true);
      setError(null);
      try {
        const catalog = await fetchSalesOrderCatalog(orderType);
        if (!cancelled) setOptions(catalog);
      } catch (err) {
        if (!cancelled) {
          setOptions([]);
          setError(err instanceof Error ? err.message : 'Failed to load catalog items.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderType]);

  return { options, loading, error };
}
