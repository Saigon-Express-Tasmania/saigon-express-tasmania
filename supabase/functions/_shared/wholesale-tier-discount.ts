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

/** Apply tier discount to ex-GST unit price, then add GST and round to cents. */
function discountedIncGstUnitAmountCents(
  unitPriceExGst: number,
  tierMultiplier: number,
): number {
  const discountedExGst = Number(
    (unitPriceExGst * tierMultiplier).toFixed(2),
  );
  const unitIncGst = Number((discountedExGst * 1.1).toFixed(2));
  return Math.round(unitIncGst * 100);
}

function sumStripeProductsCents(
  lines: WholesalePricingLine[],
  unitAmountCents: number[],
): number {
  let total = 0;
  for (let index = 0; index < lines.length; index++) {
    total += unitAmountCents[index] * lines[index].qty;
  }
  return total;
}

/** Nudge per-line Stripe cents so product lines sum to the aggregate inc-GST total. */
function reconcileStripeLineCents(
  lines: WholesalePricingLine[],
  unitAmountCents: number[],
  targetProductsCents: number,
): number[] {
  const result = [...unitAmountCents];
  let drift =
    targetProductsCents - sumStripeProductsCents(lines, result);
  if (drift === 0) return result;

  const indices = lines
    .map((line, index) => ({ index, qty: line.qty }))
    .filter(({ qty }) => qty > 0)
    .sort((a, b) => b.qty - a.qty);

  for (const { index, qty } of indices) {
    if (drift === 0) break;
    const step = Math.sign(drift);
    while (Math.abs(drift) >= qty) {
      result[index] += step;
      drift -= step * qty;
    }
  }

  if (drift !== 0) {
    for (let index = lines.length - 1; index >= 0; index--) {
      const qty = lines[index].qty;
      if (qty > 0 && drift % qty === 0) {
        result[index] += drift / qty;
        drift = 0;
        break;
      }
    }
  }

  if (drift !== 0) {
    const singleLineIndex = lines.findIndex((line) => line.qty === 1);
    if (singleLineIndex >= 0) {
      result[singleLineIndex] += drift;
      drift = 0;
    }
  }

  return result;
}

/**
 * Wholesale totals: tier discount applies to the product subtotal (ex GST) only.
 * GST is calculated on the discounted product value; shipping is not discounted.
 */
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
  const netExGst = Number((subtotal - wholesale_discount).toFixed(2));
  const tax_total = Number((netExGst * 0.1).toFixed(2));
  const productsIncGstTotal = Number((netExGst + tax_total).toFixed(2));

  let stripe_unit_amount_cents = lines.map((line) =>
    discountedIncGstUnitAmountCents(line.unitPriceExGst, tierMultiplier),
  );
  stripe_unit_amount_cents = reconcileStripeLineCents(
    lines,
    stripe_unit_amount_cents,
    Math.round(productsIncGstTotal * 100),
  );

  const productsTotalCents = sumStripeProductsCents(
    lines,
    stripe_unit_amount_cents,
  );
  const reconciledProductsIncGst = productsTotalCents / 100;
  const reconciled_tax_total = Number(
    (reconciledProductsIncGst - netExGst).toFixed(2),
  );
  const grand_total = Number(
    (reconciledProductsIncGst + shippingFee).toFixed(2),
  );

  return {
    subtotal,
    wholesale_discount,
    tax_total: reconciled_tax_total,
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
