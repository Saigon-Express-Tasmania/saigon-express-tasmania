import { createServiceClient } from "./supabase.ts";
import type { OrderItemCustomisation } from "./order-item-customisation.ts";

export type CateringCatalogPriceItem = {
  productId: number;
  unitPrice: number;
  itemName: string;
  variantLabel?: string | null;
  customisation?: OrderItemCustomisation | null;
};

type CateringTierRow = {
  size: string;
  price: string;
};

type CateringProductPriceRow = {
  unit_price: string | null;
  prices: unknown;
};

export function parseCateringTierPrices(value: unknown): CateringTierRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        size: String(row.size ?? "").trim(),
        price: String(row.price ?? "").trim(),
      };
    })
    .filter((tier) => tier.size && tier.price);
}

/** Parse catering catalogue prices stored as "$95", "95", etc. */
export function parseCatalogUnitPriceAmount(
  value: string | null | undefined,
): number | null {
  if (!value?.trim()) return null;

  const withDollar = value.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (withDollar) {
    const amount = Number(withDollar[1]);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }

  const plain = value.trim().match(/^(\d+(?:\.\d{1,2})?)$/);
  if (plain) {
    const amount = Number(plain[1]);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }

  return null;
}

export function resolveCateringCatalogUnitPrice(
  row: CateringProductPriceRow,
  options?: {
    variantLabel?: string | null;
    clientUnitPrice?: number | null;
  },
): number | null {
  const tiers = parseCateringTierPrices(row.prices);
  const variant = options?.variantLabel?.trim();

  if (variant) {
    const tier = tiers.find((entry) => entry.size === variant);
    if (tier) {
      const tierAmount = parseCatalogUnitPriceAmount(tier.price);
      if (tierAmount != null) return tierAmount;
    }
  }

  const clientUnitPrice = options?.clientUnitPrice;
  if (clientUnitPrice != null && tiers.length > 0) {
    for (const tier of tiers) {
      const tierAmount = parseCatalogUnitPriceAmount(tier.price);
      if (tierAmount != null && Math.abs(tierAmount - clientUnitPrice) <= 0.01) {
        return tierAmount;
      }
    }
  }

  return parseCatalogUnitPriceAmount(row.unit_price);
}

export async function validateCateringCatalogUnitPrices(
  items: CateringCatalogPriceItem[],
): Promise<void> {
  const supabase = createServiceClient();
  const productIds = [...new Set(items.map((item) => item.productId))];
  if (productIds.length === 0) return;

  const { data, error } = await supabase
    .from("products")
    .select("id, unit_price, prices, product_type")
    .in("id", productIds)
    .eq("product_type", "catering");

  if (error) {
    throw new Error(error.message);
  }

  const rowsById = new Map<number, CateringProductPriceRow>();
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const id = Number(record.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    rowsById.set(id, {
      unit_price:
        record.unit_price != null ? String(record.unit_price).trim() : null,
      prices: record.prices,
    });
  }

  for (const item of items) {
    const row = rowsById.get(item.productId);
    if (!row) {
      throw new Error(`${item.itemName} is not available for catering checkout.`);
    }

    const extraPrice = Number(item.customisation?.extraPrice ?? 0);
    const baseUnitPrice =
      item.unitPrice - (Number.isFinite(extraPrice) ? extraPrice : 0);

    const catalogueAmount = resolveCateringCatalogUnitPrice(row, {
      variantLabel: item.variantLabel,
      clientUnitPrice: baseUnitPrice,
    });

    if (catalogueAmount == null) {
      throw new Error(
        `${item.itemName} requires a custom quote and cannot be paid online.`,
      );
    }

    if (Math.abs(catalogueAmount - baseUnitPrice) > 0.01) {
      throw new Error(
        `The price for ${item.itemName} has changed. Please refresh and try again.`,
      );
    }
  }
}
