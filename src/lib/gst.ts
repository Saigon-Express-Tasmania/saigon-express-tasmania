import { DEFAULT_GST_TAX_RATE, DEFAULT_IS_GST_INCLUSIVE } from "@/config/settings";

export type GstPricingLine = {
  qty: number;
  unitPriceExGst: number;
  /** When true, the line is GST-free (e.g. basic food). */
  gstFree?: boolean;
};

export type GstTotalsInput = {
  lines: GstPricingLine[];
  gstTaxRate?: number;
  couponDiscount?: number;
  wholesaleDiscount?: number;
  shippingFee?: number;
};

export type GstTotalsResult = {
  subtotalExGst: number;
  taxableExGst: number;
  gstFreeExGst: number;
  couponDiscount: number;
  wholesaleDiscount: number;
  totalDiscount: number;
  netTaxableExGst: number;
  netGstFreeExGst: number;
  netSubtotalExGst: number;
  productGst: number;
  shippingGst: number;
  taxTotal: number;
  shippingFee: number;
  grandTotalIncGst: number;
  taxableRatio: number;
};

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export function parseGstTaxRate(raw: string | undefined | null): number {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return DEFAULT_GST_TAX_RATE;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_GST_TAX_RATE;

  if (parsed > 1) return parsed / 100;
  return parsed;
}

export function formatGstRateLabel(gstTaxRate: number): string {
  return `${Math.round(gstTaxRate * 100)}%`;
}

export function parseIsGstInclusive(raw: string | undefined | null): boolean {
  const trimmed = String(raw ?? "").trim().toLowerCase();
  if (!trimmed) return DEFAULT_IS_GST_INCLUSIVE;
  return trimmed === "true";
}

export type CommerceTaxSettings = {
  isGstInclusive: boolean;
  gstTaxRate: number;
};

export function resolveCommerceTaxSettings(
  settings: Record<string, string>,
): CommerceTaxSettings {
  return {
    isGstInclusive: parseIsGstInclusive(settings.is_gst_inclusive),
    gstTaxRate: parseGstTaxRate(settings.gst_tax_rate),
  };
}

function lineTotalExGst(line: GstPricingLine): number {
  return line.qty * line.unitPriceExGst;
}

function splitLinesExGst(lines: GstPricingLine[]): {
  taxableExGst: number;
  gstFreeExGst: number;
  subtotalExGst: number;
} {
  let taxableExGst = 0;
  let gstFreeExGst = 0;

  for (const line of lines) {
    const lineTotal = lineTotalExGst(line);
    if (line.gstFree) {
      gstFreeExGst += lineTotal;
    } else {
      taxableExGst += lineTotal;
    }
  }

  return {
    taxableExGst: roundMoney(taxableExGst),
    gstFreeExGst: roundMoney(gstFreeExGst),
    subtotalExGst: roundMoney(taxableExGst + gstFreeExGst),
  };
}

function apportionDiscount(
  discount: number,
  taxableExGst: number,
  gstFreeExGst: number,
  subtotalExGst: number,
): { taxableDiscount: number; gstFreeDiscount: number } {
  if (discount <= 0 || subtotalExGst <= 0) {
    return { taxableDiscount: 0, gstFreeDiscount: 0 };
  }

  const cappedDiscount = Math.min(discount, subtotalExGst);
  const taxableDiscount = roundMoney(
    cappedDiscount * (taxableExGst / subtotalExGst),
  );
  const gstFreeDiscount = roundMoney(cappedDiscount - taxableDiscount);

  return { taxableDiscount, gstFreeDiscount };
}

/**
 * Australian GST totals: taxable goods attract GST; delivery fee GST follows
 * the taxable share of the order value (ATO apportionment by price).
 */
export function computeGstTotals(input: GstTotalsInput): GstTotalsResult {
  const gstTaxRate = input.gstTaxRate ?? DEFAULT_GST_TAX_RATE;
  const couponDiscount = roundMoney(input.couponDiscount ?? 0);
  const wholesaleDiscount = roundMoney(input.wholesaleDiscount ?? 0);
  const shippingFee = roundMoney(input.shippingFee ?? 0);
  const totalDiscount = roundMoney(couponDiscount + wholesaleDiscount);

  const { taxableExGst, gstFreeExGst, subtotalExGst } = splitLinesExGst(
    input.lines,
  );

  const { taxableDiscount, gstFreeDiscount } = apportionDiscount(
    totalDiscount,
    taxableExGst,
    gstFreeExGst,
    subtotalExGst,
  );

  const netTaxableExGst = roundMoney(
    Math.max(taxableExGst - taxableDiscount, 0),
  );
  const netGstFreeExGst = roundMoney(
    Math.max(gstFreeExGst - gstFreeDiscount, 0),
  );
  const netSubtotalExGst = roundMoney(netTaxableExGst + netGstFreeExGst);

  const taxableRatio =
    netSubtotalExGst > 0 ? netTaxableExGst / netSubtotalExGst : 0;

  const productGst = roundMoney(netTaxableExGst * gstTaxRate);
  const shippingGst = roundMoney(shippingFee * taxableRatio * gstTaxRate);
  const taxTotal = roundMoney(productGst + shippingGst);
  const grandTotalIncGst = roundMoney(
    netSubtotalExGst + taxTotal + shippingFee,
  );

  return {
    subtotalExGst,
    taxableExGst,
    gstFreeExGst,
    couponDiscount,
    wholesaleDiscount,
    totalDiscount,
    netTaxableExGst,
    netGstFreeExGst,
    netSubtotalExGst,
    productGst,
    shippingGst,
    taxTotal,
    shippingFee,
    grandTotalIncGst,
    taxableRatio,
  };
}

export function cartItemsToGstPricingLines(
  items: { qty: number; unitPrice: number; gstFree?: boolean }[],
): GstPricingLine[] {
  return items.map((item) => ({
    qty: item.qty,
    unitPriceExGst: Number(item.unitPrice),
    gstFree: item.gstFree ?? false,
  }));
}
