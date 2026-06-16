import { getWholesaleContactName, WHOLESALE_DEFAULT_COUNTRY } from "@/lib/wholesale-b2b-order";
import type { UserProfile } from "@/types/UserProfile";
import type { CateringOrderReviewForm } from "@/types/CateringOrderReview";
import type { AustralianStateCode } from "@/types/WholesaleB2BOrder";
import type { CateringCartItem } from "@/contexts/CateringCartContext";

function trimmedOrEmpty(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export type CateringPricingLine = {
  qty: number;
  unitPriceExGst: number;
};

function toPricingLines(items: CateringCartItem[]): CateringPricingLine[] {
  return items.map((item) => ({
    qty: item.qty,
    unitPriceExGst: Number(item.unitPrice),
  }));
}

export function buildCateringOrderTotals(
  lines: CateringPricingLine[],
  options: {
    couponDiscount?: number;
    wholesaleDiscount?: number;
    shippingFee?: number;
  } = {},
): Pick<
  CateringOrderReviewForm,
  | "subtotal"
  | "coupon_discount"
  | "wholesale_discount"
  | "tax_total"
  | "shipping_fee"
  | "grand_total"
> {
  const subtotal = Number(
    lines
      .reduce((sum, line) => sum + line.qty * line.unitPriceExGst, 0)
      .toFixed(2),
  );
  const couponDiscount = Number((options.couponDiscount ?? 0).toFixed(2));
  const wholesaleDiscount = Number((options.wholesaleDiscount ?? 0).toFixed(2));
  const shippingFee = Number((options.shippingFee ?? 0).toFixed(2));
  const discountedSubtotal = Number(
    Math.max(subtotal - couponDiscount - wholesaleDiscount, 0).toFixed(2),
  );
  const taxTotal = Number((discountedSubtotal * 0.1).toFixed(2));
  const grandTotal = Number(
    (discountedSubtotal + taxTotal + shippingFee).toFixed(2),
  );

  return {
    subtotal,
    coupon_discount: couponDiscount,
    wholesale_discount: wholesaleDiscount,
    tax_total: taxTotal,
    shipping_fee: shippingFee,
    grand_total: grandTotal,
  };
}

export function withCateringOrderTotals(
  form: CateringOrderReviewForm,
  items: CateringCartItem[],
): CateringOrderReviewForm {
  return {
    ...form,
    ...buildCateringOrderTotals(toPricingLines(items), {
      couponDiscount: form.coupon_discount,
      wholesaleDiscount: form.wholesale_discount,
      shippingFee: form.shipping_fee,
    }),
  };
}

export function buildCateringOrderReviewFromProfile(
  profile: UserProfile,
  customerEmail: string,
  items: CateringCartItem[],
): CateringOrderReviewForm {
  const totals = buildCateringOrderTotals(toPricingLines(items));

  return {
    customer_name: getWholesaleContactName(profile),
    customer_email: customerEmail,
    customer_phone: trimmedOrEmpty(profile.phone),
    event_date: "",
    guest_count: "",
    shipping_dba_name: trimmedOrEmpty(profile.shipping_dba_name || profile.business_name),
    shipping_address: trimmedOrEmpty(profile.shipping_address),
    shipping_city: trimmedOrEmpty(profile.shipping_city),
    shipping_state: (profile.shipping_state as AustralianStateCode | null) ?? "",
    shipping_postal_code: trimmedOrEmpty(profile.shipping_postal_code),
    shipping_country: trimmedOrEmpty(profile.shipping_country) || WHOLESALE_DEFAULT_COUNTRY,
    shipping_preferred_window: trimmedOrEmpty(profile.shipping_preferred_window),
    notes: null,
    coupon_code: null,
    ...totals,
  };
}

export function validateCateringOrderReview(
  form: CateringOrderReviewForm,
): string | null {
  if (!form.customer_name.trim()) return "Please enter your name.";
  if (!form.customer_email.trim()) return "Please enter your email.";
  if (!form.customer_phone.trim()) return "Please enter your phone number.";
  if (!form.event_date.trim()) return "Please select an event date.";
  if (!form.shipping_address.trim()) return "Delivery address is required.";
  if (!form.shipping_city.trim()) return "Delivery city is required.";
  if (!form.shipping_state.trim()) return "Delivery state is required.";
  if (!form.shipping_postal_code.trim()) return "Delivery postal code is required.";
  if (form.grand_total <= 0) return "Order total must be greater than zero.";
  return null;
}

export function serializeCateringOrderReviewForPlacement(
  form: CateringOrderReviewForm,
) {
  const noteLines = [
    form.guest_count.trim() ? `Guest count: ${form.guest_count.trim()}` : null,
    form.shipping_preferred_window.trim()
      ? `Delivery window: ${form.shipping_preferred_window.trim()}`
      : null,
    form.notes?.trim() || null,
  ].filter(Boolean);

  return {
    customerName: form.customer_name.trim(),
    customerEmail: form.customer_email.trim(),
    customerPhone: form.customer_phone.trim(),
    fulfillmentType: "delivery" as const,
    pickupTime: form.event_date.trim(),
    notes: noteLines.length > 0 ? noteLines.join("\n") : undefined,
    financialDetails: {
      subtotal_ex_gst: form.subtotal,
      gst_total: form.tax_total,
      grand_total_inc_gst: form.grand_total,
      shipping_fee: form.shipping_fee,
      coupon_code: form.coupon_code,
      coupon_discount: form.coupon_discount,
      currency: "AUD",
    },
    shippingAddress: {
      dba_name: form.shipping_dba_name.trim() || form.customer_name.trim(),
      street_1: form.shipping_address.trim(),
      street_2: null,
      city: form.shipping_city.trim(),
      state: form.shipping_state,
      postal_code: form.shipping_postal_code.trim(),
      country: form.shipping_country.trim() || WHOLESALE_DEFAULT_COUNTRY,
      special_instructions: null,
      preferred_window: form.shipping_preferred_window.trim() || null,
    },
  };
}

/** @deprecated Use serializeCateringOrderReviewForPlacement */
export const serializeCateringOrderReviewForCheckout =
  serializeCateringOrderReviewForPlacement;
