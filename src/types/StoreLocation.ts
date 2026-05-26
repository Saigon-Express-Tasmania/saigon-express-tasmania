/** Row shape from `public.store_locations` (snake_case). */
export type StoreLocationRow = {
  id: number;
  name: string;
  address: string;
  suburb: string | null;
  lat: string | null;
  lng: string | null;
  phone: string | null;
  hours: string | null;
  is_active: boolean;
  delivery_url: string | null;
};

/** Store location used by UI components (camelCase). */
export type StoreLocation = {
  id: number;
  name: string;
  address: string;
  suburb: string | null;
  lat: string | null;
  lng: string | null;
  phone: string | null;
  hours: string | null;
  isActive: boolean;
  deliveryUrl: string | null;
};

export function mapStoreLocationRow(row: StoreLocationRow): StoreLocation {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    suburb: row.suburb,
    lat: row.lat,
    lng: row.lng,
    phone: row.phone,
    hours: row.hours,
    isActive: row.is_active,
    deliveryUrl: row.delivery_url,
  };
}

