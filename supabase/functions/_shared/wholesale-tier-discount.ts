export type WholesaleTierRow = {
  label: string;
  min_value: number;
  discount_value: number;
};

export type WholesalePricingLine = {
  qty: number;
  unitPriceExGst: number;
};

export type WholesaleTierDiscountTotals = {
  subtotal: number;
  wholesale_discount: number;
  tax_total: number;
  shipping_fee: number;
  grand_total: number;
  tier_discount_percent: number;
  tier_label: string | null;
  stripe_unit_amount_cents: number[];
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

function roundIncGstUnitAmountCents(
  unitPriceExGst: number,
  tierMultiplier: number,
): number {
  const unitIncGst = Number((unitPriceExGst * 1.1).toFixed(2));
  return Math.round(unitIncGst * tierMultiplier * 100);
}

export function computeWholesaleTierDiscountTotals(
  lines: WholesalePricingLine[],
  tiers: WholesaleTierRow[],
  shippingFee = 0,
): WholesaleTierDiscountTotals {
  const subtotal = Number(
    lines
      .reduce((sum, line) => sum + line.qty * line.unitPriceExGst, 0)
      .toFixed(2),
  );
  const tier = resolveApplicableWholesaleTier(tiers, subtotal);
  const tierMultiplier = tier ? 1 - tier.discount_value / 100 : 1;
  const wholesale_discount = tier
    ? Number((subtotal * (tier.discount_value / 100)).toFixed(2))
    : 0;
  const netExGst = subtotal - wholesale_discount;

  const stripe_unit_amount_cents = lines.map((line) =>
    roundIncGstUnitAmountCents(line.unitPriceExGst, tierMultiplier),
  );

  let productsTotalCents = 0;
  for (let index = 0; index < lines.length; index++) {
    productsTotalCents += stripe_unit_amount_cents[index] * lines[index].qty;
  }

  const grand_total =
    (productsTotalCents + Math.round(shippingFee * 100)) / 100;
  const productsIncGstTotal = Number((grand_total - shippingFee).toFixed(2));
  const tax_total = Number((productsIncGstTotal - netExGst).toFixed(2));

  return {
    subtotal,
    wholesale_discount,
    tax_total,
    shipping_fee: shippingFee,
    grand_total,
    tier_discount_percent: tier?.discount_value ?? 0,
    tier_label: tier?.label ?? null,
    stripe_unit_amount_cents,
  };
}

/** Sum ex-GST line totals (checkout items use ex-GST unit prices). */
export function wholesaleItemsSubtotalExGst(
  items: { qty: number; unitPrice: number }[],
): number {
  return Number(
    items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0).toFixed(2),
  );
}
