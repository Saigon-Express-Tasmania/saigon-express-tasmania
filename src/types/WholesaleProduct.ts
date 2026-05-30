/** Size key → public image URL (e.g. `"512"` → `https://...`). */
export type WholesaleImageUrls = Record<string, string>;

/** Row shape from `public.wholesale_products` (snake_case). */
export type WholesaleProductRow = {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  unit: string;
  unit_price: string;
  stock_qty: number;
  is_available: boolean;
  min_order_qty: number;
  image_urls: WholesaleImageUrls;
  created_at: string;
  updated_at: string;
};

/** Product used by the wholesale shop UI (camelCase). */
export type WholesaleProduct = {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  unit: string;
  unitPrice: string;
  stockQty: number;
  isAvailable: boolean;
  minOrderQty: number;
  imageUrls: WholesaleImageUrls;
  createdAt: string;
  updatedAt: string;
};

export function normalizeWholesaleImageUrls(
  value: unknown,
): WholesaleImageUrls {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.entries(value as Record<string, unknown>).reduce<WholesaleImageUrls>(
    (acc, [key, url]) => {
      const trimmed = String(url ?? '').trim();
      if (trimmed) acc[key] = trimmed;
      return acc;
    },
    {},
  );
}

/** Pick the first available URL from preferred size keys (largest first by default). */
export function pickWholesaleImageUrl(
  urls: WholesaleImageUrls | null | undefined,
  preferredSizes: number[] = [1024, 1448, 512, 256],
): string | null {
  const map = urls ?? {};
  for (const size of preferredSizes) {
    const url = map[String(size)]?.trim();
    if (url) return url;
  }
  const fallback = Object.values(map).find((url) => url?.trim());
  return fallback?.trim() ?? null;
}

export function mapWholesaleProductRow(row: WholesaleProductRow): WholesaleProduct {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    description: row.description,
    unit: row.unit,
    unitPrice: row.unit_price,
    stockQty: row.stock_qty,
    isAvailable: row.is_available,
    minOrderQty: row.min_order_qty,
    imageUrls: normalizeWholesaleImageUrls(row.image_urls),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
