import supabase from '@/lib/supabase/client';
import Fuse from 'fuse.js';

export type DeliveryCityOption = {
  id: number;
  name: string;
  postalCode: number;
  distanceKm: number | null;
};

export function formatDeliveryCityLabel(city: DeliveryCityOption): string {
  return `${city.name} ${city.postalCode}`;
}

export async function fetchDeliveryCityOptions(): Promise<DeliveryCityOption[]> {
  const { data, error } = await supabase
    .from('delivery_cities')
    .select('id, name, postal_code, my_distance')
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? '').trim(),
    postalCode: Number(row.postal_code),
    distanceKm:
      row.my_distance == null ? null : Number.parseFloat(String(row.my_distance)),
  }));
}

export function filterDeliveryCityOptions(
  options: DeliveryCityOption[],
  query: string,
  limit = 12,
): DeliveryCityOption[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return options.slice(0, limit);
  }

  const fuse = new Fuse(options, {
    keys: [
      { name: 'name', weight: 0.7 },
      {
        name: 'postalCode',
        getFn: (city) => String(city.postalCode),
      },
    ],
    threshold: 0.35,
    ignoreLocation: true,
  });

  return fuse.search(trimmed, { limit }).map((result) => result.item);
}
