import {
  normalizeImageUrls,
  previewFromImageUrls,
  type ImageUrlsMap,
} from '@/lib/image-urls';
import { fetchSettingsByKeys } from '@/lib/settings';
import supabase from '@/lib/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import type { OrderType } from './orderType';
import type { SalesOrderItemForm } from './salesOrderShared';

const CATALOG_IMAGE_SIZES = [256, 512, 1024, 1448];

export type SalesOrderCatalogOption = {
  id: number;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
};

type SalesOrderCatalogProductType = 'alacarte' | 'wholesale' | 'catering';

type ProductImageRow = {
  id: unknown;
  image_urls?: unknown;
  image_url?: unknown;
};

export function getOrderItemIdColumnLabel(_orderType: OrderType): string {
  return 'Product ID';
}

export function getSalesOrderCatalogProductType(
  orderType: OrderType,
): SalesOrderCatalogProductType {
  if (orderType === 'wholesale') return 'wholesale';
  if (orderType === 'catering') return 'catering';
  return 'alacarte';
}

/** @deprecated Use getSalesOrderCatalogProductType instead. */
export function usesWholesaleCatalog(orderType: OrderType): boolean {
  return orderType === 'wholesale';
}

function productImageUrlsFromRow(row: ProductImageRow): ImageUrlsMap {
  const normalized = normalizeImageUrls(row.image_urls);
  if (Object.keys(normalized).length > 0) return normalized;

  const legacyUrl = String(row.image_url ?? '').trim();
  return legacyUrl ? { '1920': legacyUrl } : {};
}

function previewProductImageUrl(
  row: ProductImageRow,
  siteUrl: string | null,
): string | null {
  return previewFromImageUrls(
    productImageUrlsFromRow(row),
    CATALOG_IMAGE_SIZES,
    siteUrl,
  );
}

function unitPriceFromRow(
  row: { price?: unknown; unit_price?: unknown },
  productType: SalesOrderCatalogProductType,
): number {
  const raw =
    productType === 'alacarte'
      ? String(row.price ?? '0')
      : String(row.unit_price ?? '0');
  return Number.parseFloat(raw) || 0;
}

function mapCatalogRow(
  row: ProductImageRow & { name?: unknown; price?: unknown; unit_price?: unknown },
  productType: SalesOrderCatalogProductType,
  siteUrl: string | null,
): SalesOrderCatalogOption {
  return {
    id: Number(row.id),
    name: String(row.name ?? '').trim(),
    unitPrice: unitPriceFromRow(row, productType),
    imageUrl: previewProductImageUrl(row, siteUrl),
  };
}

async function fetchSiteUrl(): Promise<string | null> {
  const settings = await fetchSettingsByKeys(['site_url']);
  const url = settings.site_url?.trim();
  return url || null;
}

async function fetchProductCatalog(
  productType: SalesOrderCatalogProductType,
  siteUrl: string | null,
): Promise<SalesOrderCatalogOption[]> {
  const select =
    productType === 'alacarte'
      ? 'id, name, price, image_url, image_urls'
      : 'id, name, unit_price, image_url, image_urls';

  const { data, error } = await supabase
    .from('products')
    .select(select)
    .eq('product_type', productType)
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) =>
    mapCatalogRow(
      row as ProductImageRow & { name?: unknown; price?: unknown; unit_price?: unknown },
      productType,
      siteUrl,
    ),
  );
}

export async function fetchProductImagesByIds(
  productIds: number[],
  siteUrl: string | null,
): Promise<Map<number, string>> {
  const uniqueIds = [...new Set(productIds.filter((id) => id > 0))];
  const imageMap = new Map<number, string>();
  if (uniqueIds.length === 0) return imageMap;

  const { data, error } = await supabase
    .from('products')
    .select('id, image_url, image_urls')
    .in('id', uniqueIds);

  if (error) throw error;

  for (const row of data ?? []) {
    const imageUrl = previewProductImageUrl(row as ProductImageRow, siteUrl);
    if (imageUrl) {
      imageMap.set(Number(row.id), imageUrl);
    }
  }

  return imageMap;
}

export function buildSalesOrderItemImageMap(
  options: SalesOrderCatalogOption[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const option of options) {
    if (option.imageUrl) {
      map.set(option.id, option.imageUrl);
    }
  }
  return map;
}

export function resolveSalesOrderLineItemImageUrl(
  productId: number,
  imageByProductId: Map<number, string>,
): string | undefined {
  if (productId <= 0) return undefined;
  return imageByProductId.get(productId);
}

export async function fetchSalesOrderCatalog(
  orderType: OrderType,
): Promise<SalesOrderCatalogOption[]> {
  const siteUrl = await fetchSiteUrl();
  return fetchProductCatalog(getSalesOrderCatalogProductType(orderType), siteUrl);
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

export function useSalesOrderLineItemImages(
  orderType: OrderType | null,
  items: SalesOrderItemForm[],
) {
  const { options, loading, error } = useSalesOrderCatalog(orderType);
  const [supplementalImages, setSupplementalImages] = useState<Map<number, string>>(
    () => new Map(),
  );

  const catalogImageMap = useMemo(
    () => buildSalesOrderItemImageMap(options),
    [options],
  );

  const lineItemProductIds = useMemo(
    () => [...new Set(items.map((item) => item.menu_item_id).filter((id) => id > 0))],
    [items],
  );

  const missingProductIds = useMemo(
    () => lineItemProductIds.filter((id) => !catalogImageMap.has(id)),
    [lineItemProductIds, catalogImageMap],
  );

  useEffect(() => {
    if (!orderType || missingProductIds.length === 0) {
      setSupplementalImages(new Map());
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const siteUrl = await fetchSiteUrl();
        const extra = await fetchProductImagesByIds(missingProductIds, siteUrl);
        if (!cancelled) setSupplementalImages(extra);
      } catch {
        if (!cancelled) setSupplementalImages(new Map());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderType, missingProductIds]);

  const imageByProductId = useMemo(() => {
    const merged = new Map(catalogImageMap);
    for (const [id, url] of supplementalImages) {
      merged.set(id, url);
    }
    return merged;
  }, [catalogImageMap, supplementalImages]);

  const resolveLineItemImageUrl = (item: SalesOrderItemForm) =>
    resolveSalesOrderLineItemImageUrl(item.menu_item_id, imageByProductId);

  return {
    options,
    loading,
    error,
    imageByProductId,
    resolveLineItemImageUrl,
  };
}
