export type WholesaleTierRow = {
  label: string;
  min_value: number;
  discount_value: number;
};

export type WholesaleTierDiscountTotals = {
  subtotal: number;
  wholesale_discount: number;
  tax_total: number;
  shipping_fee: number;
  grand_total: number;
  tier_discount_percent: number;
  tier_label: string | null;
};

export function resolveApplicableWholesaleTier(
  tiers: WholesaleTierRow[],
  subtotalExGst: number,
): WholesaleTierRow | null {
  const qualifying = tiers
    .filter(
      (tier) =>
        tier.min_value > 0 &&
        tier.discount_value > 0 &&
        subtotalExGst >= tier.min_value,
    )
    .sort((a, b) => b.min_value - a.min_value);

  return qualifying[0] ?? null;
}

export function computeWholesaleTierDiscountTotals(
  subtotalExGst: number,
  tiers: WholesaleTierRow[],
  shippingFee = 0,
): WholesaleTierDiscountTotals {
  const subtotal = Number(subtotalExGst.toFixed(2));
  const tier = resolveApplicableWholesaleTier(tiers, subtotal);
  const wholesale_discount = tier
    ? Number((subtotal * (tier.discount_value / 100)).toFixed(2))
    : 0;
  const netExGst = subtotal - wholesale_discount;
  const tax_total = Number((netExGst * 0.1).toFixed(2));
  const grand_total = Number((netExGst + tax_total + shippingFee).toFixed(2));

  return {
    subtotal,
    wholesale_discount,
    tax_total,
    shipping_fee: shippingFee,
    grand_total,
    tier_discount_percent: tier?.discount_value ?? 0,
    tier_label: tier?.label ?? null,
  };
}

/** Wholesale checkout line items use inc-GST unit prices. */
export function wholesaleItemsSubtotalExGst(
  items: { qty: number; unitPrice: number }[],
): number {
  const incGst = items.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );
  return Number((incGst / 1.1).toFixed(2));
}
