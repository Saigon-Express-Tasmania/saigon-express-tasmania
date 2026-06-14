/** Row shape from `public.wholesale_tiers` (snake_case). */
export type WholesaleTierRow = {
  id: number;
  label: string;
  min_value: number;
  discount_value: number;
  color: string;
  popular: boolean;
  sort_order: number;
};

/** Pricing tier used by the wholesale shop UI. */
export type WholesalePricingTier = {
  id: number;
  label: string;
  minValue: number;
  discountValue: number;
  color: string;
  popular: boolean;
  sortOrder: number;
};

export function mapWholesaleTierRow(row: WholesaleTierRow): WholesalePricingTier {
  return {
    id: row.id,
    label: row.label,
    minValue: Number(row.min_value),
    discountValue: Number(row.discount_value),
    color: row.color,
    popular: row.popular,
    sortOrder: row.sort_order,
  };
}

export function formatTierMinValue(value: number): string {
  if (value <= 0) return "$0+";
  return `$${value.toLocaleString("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}+`;
}

export function formatTierDiscountValue(value: number): string {
  const pct = Number(value);
  if (pct === 0) return "0%";
  const formatted =
    pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1).replace(/\.0$/, "");
  return `${formatted}%`;
}
