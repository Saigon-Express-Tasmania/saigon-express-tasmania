/** Row shape from `public.store_locations` (snake_case). */
export type StoreLocationRow = {
  id: number;
  name: string;
  address: string;
  suburb: string | null;
  lat: string | null;
  lng: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  is_active: boolean;
  is_invoice_creator: boolean;
  is_shipping: boolean;
  delivery_url: string | null;
  google_map_url: string | null;
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
  email: string | null;
  hours: string | null;
  /** Shown in public UI (store finder, pickup). Not operational status. */
  isActive: boolean;
  isInvoiceCreator: boolean;
  isShipping: boolean;
  deliveryUrl: string | null;
  googleMapUrl: string | null;
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
    email: row.email,
    hours: row.hours,
    isActive: row.is_active,
    isInvoiceCreator: row.is_invoice_creator,
    isShipping: row.is_shipping,
    deliveryUrl: row.delivery_url,
    googleMapUrl: row.google_map_url,
  };
}

