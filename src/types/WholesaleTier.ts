/** Row shape from `public.wholesale_tiers` (snake_case). */
export type WholesaleTierRow = {
  id: number;
  label: string;
  min_units: string;
  discount: string;
  color: string;
  popular: boolean;
  sort_order: number;
};

/** Pricing tier used by the wholesale shop UI. */
export type WholesalePricingTier = {
  id: number;
  label: string;
  min: string;
  discount: string;
  color: string;
  popular: boolean;
  sortOrder: number;
};

export function mapWholesaleTierRow(row: WholesaleTierRow): WholesalePricingTier {
  return {
    id: row.id,
    label: row.label,
    min: row.min_units,
    discount: row.discount,
    color: row.color,
    popular: row.popular,
    sortOrder: row.sort_order,
  };
}
