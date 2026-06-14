import type { WholesalePricingTier } from "@/types/WholesaleTier";

export type WholesaleTierDiscountResult = {
  subtotalExGst: number;
  wholesaleDiscount: number;
  taxTotal: number;
  shippingFee: number;
  grandTotal: number;
  appliedTier: WholesalePricingTier | null;
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

export function computeWholesaleTierDiscount(
  subtotalExGst: number,
  tiers: WholesalePricingTier[],
  shippingFee = 0,
): WholesaleTierDiscountResult {
  const subtotal = Number(subtotalExGst.toFixed(2));
  const appliedTier = resolveApplicableWholesaleTier(tiers, subtotal);
  const wholesaleDiscount = appliedTier
    ? Number((subtotal * (appliedTier.discountValue / 100)).toFixed(2))
    : 0;
  const netExGst = subtotal - wholesaleDiscount;
  const taxTotal = Number((netExGst * 0.1).toFixed(2));
  const grandTotal = Number((netExGst + taxTotal + shippingFee).toFixed(2));

  return {
    subtotalExGst: subtotal,
    wholesaleDiscount,
    taxTotal,
    shippingFee,
    grandTotal,
    appliedTier,
  };
}

/** Wholesale checkout sends inc-GST unit prices; derive ex-GST subtotal for tiers. */
export function wholesaleItemsSubtotalExGst(
  items: { qty: number; unitPrice: number }[],
): number {
  const incGst = items.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );
  return Number((incGst / 1.1).toFixed(2));
}
