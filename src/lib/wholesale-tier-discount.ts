import { DEFAULT_GST_TAX_RATE } from "@/config/settings";
import {
  computeGstTotals,
  type CommerceTaxSettings,
  type GstPricingLine,
} from "@/lib/gst";
import type { WholesalePricingTier } from "@/types/WholesaleTier";

export type WholesalePricingLine = GstPricingLine;

export type WholesaleTierDiscountResult = {
  subtotalExGst: number;
  wholesaleDiscount: number;
  taxTotal: number;
  shippingFee: number;
  grandTotal: number;
  appliedTier: WholesalePricingTier | null;
  stripeUnitAmountCents: number[];
};

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

function discountedIncGstUnitAmountCents(
  unitPriceExGst: number,
  tierMultiplier: number,
  gstTaxRate: number,
  gstFree: boolean,
): number {
  const discountedExGst = Number(
    (unitPriceExGst * tierMultiplier).toFixed(2),
  );
  if (gstFree) {
    return Math.round(discountedExGst * 100);
  }
  const unitIncGst = Number((discountedExGst * (1 + gstTaxRate)).toFixed(2));
  return Math.round(unitIncGst * 100);
}

function discountedUnitAmountCents(
  unitPriceIncGst: number,
  tierMultiplier: number,
): number {
  const discounted = Number((unitPriceIncGst * tierMultiplier).toFixed(2));
  return Math.round(discounted * 100);
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

function computeExclusiveWholesaleTierDiscount(
  lines: WholesalePricingLine[],
  tiers: WholesalePricingTier[],
  shippingFee: number,
  gstTaxRate: number,
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

  const gstTotals = computeGstTotals({
    lines,
    gstTaxRate,
    wholesaleDiscount,
    shippingFee,
  });

  const netExGst = gstTotals.netSubtotalExGst;
  const productsIncGstTotal = Number(
    (netExGst + gstTotals.productGst).toFixed(2),
  );

  let stripeUnitAmountCents = lines.map((line) =>
    discountedIncGstUnitAmountCents(
      line.unitPriceExGst,
      tierMultiplier,
      gstTaxRate,
      line.gstFree ?? false,
    ),
  );
  stripeUnitAmountCents = reconcileStripeLineCents(
    lines,
    stripeUnitAmountCents,
    Math.round(productsIncGstTotal * 100),
  );

  const productsTotalCents = sumStripeProductsCents(lines, stripeUnitAmountCents);
  const reconciledProductsIncGst = productsTotalCents / 100;
  const reconciledProductGst = Number(
    (reconciledProductsIncGst - netExGst).toFixed(2),
  );
  const reconciledTaxTotal = Number(
    (reconciledProductGst + gstTotals.shippingGst).toFixed(2),
  );
  const grandTotal = Number(
    (reconciledProductsIncGst + shippingFee + gstTotals.shippingGst).toFixed(2),
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

function computeInclusiveWholesaleTierDiscount(
  lines: WholesalePricingLine[],
  tiers: WholesalePricingTier[],
  shippingFee: number,
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
  const netProducts = Number((subtotalExGst - wholesaleDiscount).toFixed(2));

  let stripeUnitAmountCents = lines.map((line) =>
    discountedUnitAmountCents(line.unitPriceExGst, tierMultiplier),
  );
  stripeUnitAmountCents = reconcileStripeLineCents(
    lines,
    stripeUnitAmountCents,
    Math.round(netProducts * 100),
  );

  const productsTotalCents = sumStripeProductsCents(lines, stripeUnitAmountCents);
  const reconciledProductsTotal = productsTotalCents / 100;
  const grandTotal = Number((reconciledProductsTotal + shippingFee).toFixed(2));

  return {
    subtotalExGst,
    wholesaleDiscount,
    taxTotal: 0,
    shippingFee,
    grandTotal,
    appliedTier,
    stripeUnitAmountCents,
  };
}

export function computeWholesaleTierDiscount(
  lines: WholesalePricingLine[],
  tiers: WholesalePricingTier[],
  shippingFee = 0,
  tax: CommerceTaxSettings = {
    isGstInclusive: true,
    gstTaxRate: DEFAULT_GST_TAX_RATE,
  },
): WholesaleTierDiscountResult {
  if (tax.isGstInclusive) {
    return computeInclusiveWholesaleTierDiscount(lines, tiers, shippingFee);
  }

  return computeExclusiveWholesaleTierDiscount(
    lines,
    tiers,
    shippingFee,
    tax.gstTaxRate,
  );
}

export function wholesaleItemsSubtotalExGst(
  items: { qty: number; unitPrice: number }[],
): number {
  return Number(
    items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0).toFixed(2),
  );
}
