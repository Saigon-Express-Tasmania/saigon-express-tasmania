import type { WholesalePricingTier } from "@/types/WholesaleTier";

export type WholesalePricingLine = {
  qty: number;
  unitPriceExGst: number;
};

export type WholesaleTierDiscountResult = {
  subtotalExGst: number;
  wholesaleDiscount: number;
  taxTotal: number;
  shippingFee: number;
  grandTotal: number;
  appliedTier: WholesalePricingTier | null;
  /** Inc-GST unit amounts in cents for Stripe (after tier discount). */
  stripeUnitAmountCents: number[];
};

/** Highest qualifying tier by minimum order value (ex GST). */
export function resolveApplicableWholesaleTier(
  tiers: WholesalePricingTier[],
  subtotalExGst: number,
): WholesalePricingTier | null {
  const qualifying = tiers
    .filter(
      (tier) =>
        tier.minValue > 0 &&
        tier.discountValue > 0 &&
        subtotalExGst >= tier.minValue,
    )
    .sort((a, b) => b.minValue - a.minValue);

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
export function computeWholesaleTierDiscount(
  lines: WholesalePricingLine[],
  tiers: WholesalePricingTier[],
  shippingFee = 0,
): WholesaleTierDiscountResult {
  const subtotalExGst = Number(
    lines
      .reduce((sum, line) => sum + line.qty * line.unitPriceExGst, 0)
      .toFixed(2),
  );
  const appliedTier = resolveApplicableWholesaleTier(tiers, subtotalExGst);
  const tierMultiplier = appliedTier
    ? 1 - appliedTier.discountValue / 100
    : 1;
  const wholesaleDiscount = appliedTier
    ? Number((subtotalExGst * (appliedTier.discountValue / 100)).toFixed(2))
    : 0;
  const netExGst = Number((subtotalExGst - wholesaleDiscount).toFixed(2));
  const taxTotal = Number((netExGst * 0.1).toFixed(2));
  const productsIncGstTotal = Number((netExGst + taxTotal).toFixed(2));

  let stripeUnitAmountCents = lines.map((line) =>
    discountedIncGstUnitAmountCents(line.unitPriceExGst, tierMultiplier),
  );
  stripeUnitAmountCents = reconcileStripeLineCents(
    lines,
    stripeUnitAmountCents,
    Math.round(productsIncGstTotal * 100),
  );

  const productsTotalCents = sumStripeProductsCents(lines, stripeUnitAmountCents);
  const reconciledProductsIncGst = productsTotalCents / 100;
  const reconciledTaxTotal = Number(
    (reconciledProductsIncGst - netExGst).toFixed(2),
  );
  const grandTotal = Number(
    (reconciledProductsIncGst + shippingFee).toFixed(2),
  );

  return {
    subtotalExGst,
    wholesaleDiscount,
    taxTotal: reconciledTaxTotal,
    shippingFee,
    grandTotal,
    appliedTier,
    stripeUnitAmountCents,
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
