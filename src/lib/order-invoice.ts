import type { OrderPaymentTerms } from "@/types/WholesaleB2BOrder";
import { formatTrackedDateLong } from "@/lib/supabase/order-tracking";

export const INVOICE_COMPANY = {
  name: "Saigon Express Lounge",
  address: "329 Elizabeth Street",
  locality: "North Hobart TAS 7000",
  phone: "0416 036 016",
  email: "info@saigonexpress.com.au",
} as const;

export function formatInvoiceNumber(orderId: number, createdAt: string): string {
  const year = new Date(createdAt).getFullYear();
  return `SE-INV-${year}-${String(orderId).padStart(4, "0")}`;
}

function paymentTermsDueDays(
  paymentTerms: OrderPaymentTerms | null | undefined,
): number {
  switch (paymentTerms) {
    case "net_30":
      return 30;
    case "net_60":
      return 60;
    case "net_90":
      return 90;
    default:
      return 0;
  }
}

export function formatInvoiceDueDate(
  issueDateIso: string,
  paymentTerms: OrderPaymentTerms | null | undefined,
): string {
  const issue = new Date(issueDateIso);
  const due = new Date(issue);
  due.setDate(due.getDate() + paymentTermsDueDays(paymentTerms));
  return formatTrackedDateLong(due.toISOString());
}

export function formatInvoiceUnit(uom: string, isCatchWeight: boolean): string {
  const base = uom.trim() || "EACH";
  if (isCatchWeight && (base === "LBS" || base === "KG")) {
    return `${base} (Est.)`;
  }
  return base;
}

export function formatInvoiceSku(sku: string, isCatchWeight: boolean): string {
  const trimmed = sku.trim();
  if (!trimmed) return "—";
  return isCatchWeight ? `${trimmed}*` : trimmed;
}

export function getInvoiceTotalDiscount(order: {
  wholesale_discount?: number | null;
  coupon_discount?: number | null;
}): number {
  const wholesale = Number(order.wholesale_discount ?? 0);
  const coupon = Number(order.coupon_discount ?? 0);
  const total =
    (Number.isFinite(wholesale) ? Math.max(wholesale, 0) : 0) +
    (Number.isFinite(coupon) ? Math.max(coupon, 0) : 0);
  return total > 0 ? total : 0;
}

export type InvoiceAddressBlock = {
  name: string;
  lines: string[];
};

export type InvoiceCompanyInfo = {
  name: string;
  lines: string[];
  phone: string;
  email: string;
};
