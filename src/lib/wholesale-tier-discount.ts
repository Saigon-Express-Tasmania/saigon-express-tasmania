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

function roundIncGstUnitAmountCents(
  unitPriceExGst: number,
  tierMultiplier: number,
): number {
  const unitIncGst = Number((unitPriceExGst * 1.1).toFixed(2));
  return Math.round(unitIncGst * tierMultiplier * 100);
}

/**
 * Wholesale totals aligned with Stripe Checkout line-item cent rounding:
 * each line uses inc-GST unit price (2dp) × tier discount, rounded to cents.
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
  const netExGst = subtotalExGst - wholesaleDiscount;

  const stripeUnitAmountCents = lines.map((line) =>
    roundIncGstUnitAmountCents(line.unitPriceExGst, tierMultiplier),
  );

  let productsTotalCents = 0;
  for (let index = 0; index < lines.length; index++) {
    productsTotalCents += stripeUnitAmountCents[index] * lines[index].qty;
  }

  const grandTotal =
    (productsTotalCents + Math.round(shippingFee * 100)) / 100;
  const productsIncGstTotal = Number((grandTotal - shippingFee).toFixed(2));
  const taxTotal = Number((productsIncGstTotal - netExGst).toFixed(2));

  return {
    subtotalExGst,
    wholesaleDiscount,
    taxTotal,
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
