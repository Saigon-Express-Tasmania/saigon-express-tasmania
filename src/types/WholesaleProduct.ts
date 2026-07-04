import { resolveSiteAssetUrl } from "@/lib/resolve-site-url";

/** Size key → public image URL (e.g. `"512"` → `https://...`). */
export type WholesaleImageUrls = Record<string, string>;

/** Row shape from `public.products` where product_type = wholesale (snake_case). */
export type WholesaleProductRow = {
  id: number;
  name: string;
  sku: string | null;
  category_id: number | null;
  category?: string;
  description: string | null;
  unit: string;
  unit_price: string;
  daily_global_limit: number;
  daily_customer_limit: number | null;
  is_available: boolean;
  min_order_qty: number;
  sort_order: number;
  image_urls: WholesaleImageUrls;
  created_at: string;
  updated_at: string;
};

export type WholesaleProductAvailabilityRow = {
  product_id: number;
  daily_global_limit: number;
  global_paid_qty: number;
  global_remaining: number;
  daily_customer_limit: number | null;
  customer_paid_qty: number;
  customer_remaining: number | null;
  effective_remaining: number;
};

/** Product used by the wholesale shop UI (camelCase). */
export type WholesaleProduct = {
  id: number;
  name: string;
  sku: string | null;
  categoryId: number | null;
  category: string;
  description: string | null;
  unit: string;
  unitPrice: string;
  dailyGlobalLimit: number;
  dailyCustomerLimit: number | null;
  globalPaidQty: number;
  globalRemaining: number;
  customerPaidQty: number;
  customerRemaining: number | null;
  effectiveRemaining: number;
  isAvailable: boolean;
  minOrderQty: number;
  sortOrder: number;
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
  siteUrl?: string | null,
): string | null {
  const map = urls ?? {};
  for (const size of preferredSizes) {
    const url = map[String(size)]?.trim();
    if (url) return resolveSiteAssetUrl(url, siteUrl);
  }
  const fallback = Object.values(map).find((url) => url?.trim());
  return fallback?.trim()
    ? resolveSiteAssetUrl(fallback.trim(), siteUrl)
    : null;
}

export function mapWholesaleProductRow(
  row: WholesaleProductRow,
  categoryName = row.category ?? "",
): WholesaleProduct {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    categoryId: row.category_id ?? null,
    category: categoryName,
    description: row.description,
    unit: row.unit,
    unitPrice: row.unit_price,
    dailyGlobalLimit: row.daily_global_limit,
    dailyCustomerLimit: row.daily_customer_limit,
    globalPaidQty: 0,
    globalRemaining: row.daily_global_limit,
    customerPaidQty: 0,
    customerRemaining: row.daily_customer_limit,
    effectiveRemaining: row.daily_global_limit,
    isAvailable: row.is_available,
    minOrderQty: row.min_order_qty,
    sortOrder: row.sort_order ?? 0,
    imageUrls: normalizeWholesaleImageUrls(row.image_urls),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function applyWholesaleProductAvailability(
  product: WholesaleProduct,
  availability: WholesaleProductAvailabilityRow | undefined,
): WholesaleProduct {
  if (!availability) return product;

  return {
    ...product,
    dailyGlobalLimit: availability.daily_global_limit,
    dailyCustomerLimit: availability.daily_customer_limit,
    globalPaidQty: Number(availability.global_paid_qty),
    globalRemaining: availability.global_remaining,
    customerPaidQty: Number(availability.customer_paid_qty),
    customerRemaining: availability.customer_remaining,
    effectiveRemaining: availability.effective_remaining,
  };
}
