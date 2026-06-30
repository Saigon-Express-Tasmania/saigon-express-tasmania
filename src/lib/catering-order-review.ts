import {
  cartItemsToGstPricingLines,
  computeGstTotals,
  type CommerceTaxSettings,
  type GstPricingLine,
} from "@/lib/gst";
import type { SelfDeliveryFee } from "@/lib/self-delivery-fee";
import { resolveSelfDeliveryShippingFee } from "@/lib/delivery-cities";
import { getWholesaleContactName, WHOLESALE_DEFAULT_COUNTRY } from "@/lib/wholesale-b2b-order";
import type { DeliveryCity } from "@/types";
import type { UserProfile } from "@/types/UserProfile";
import type { CateringOrderReviewForm } from "@/types/CateringOrderReview";
import {
  isBillingCountryAustralia,
  normalizeBillingStateForAustralia,
} from "@/lib/billing-address";
import {
  DEFAULT_AUSTRALIAN_STATE_CODE,
  type AustralianStateCode,
  type OrderFulfillmentMethod,
} from "@/types/WholesaleB2BOrder";
import type { CateringCartItem } from "@/contexts/CateringCartContext";
import { cateringCartLineUnitPrice } from "@/contexts/CateringCartContext";

export const CATERING_FULFILLMENT_OPTIONS: {
  value: Extract<OrderFulfillmentMethod, "delivery" | "pick_up">;
  label: string;
}[] = [
  { value: "delivery", label: "Deliver to venue" },
  { value: "pick_up", label: "Pick up at a store" },
];

export function isCateringPickup(
  form: Pick<CateringOrderReviewForm, "requested_fulfillment_method">,
): boolean {
  return form.requested_fulfillment_method === "pick_up";
}

export function hasCateringPickupStoreSelected(
  form: Pick<CateringOrderReviewForm, "requested_pick_up_store_id">,
): boolean {
  const id = form.requested_pick_up_store_id;
  return id != null && Number.isFinite(id) && id > 0;
}

function trimmedOrEmpty(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export type CateringPricingLine = GstPricingLine;

export type CateringOrderTotalsOptions = {
  tax?: CommerceTaxSettings;
  deliveryCities?: DeliveryCity[];
  selfDeliveryFee?: SelfDeliveryFee;
};

function isCommerceTaxSettings(
  options: CommerceTaxSettings | CateringOrderTotalsOptions,
): options is CommerceTaxSettings {
  return "isGstInclusive" in options && "gstTaxRate" in options;
}

function normalizeTotalsOptions(
  options?: CommerceTaxSettings | CateringOrderTotalsOptions,
): CateringOrderTotalsOptions {
  if (!options) return {};
  if (isCommerceTaxSettings(options)) {
    return { tax: options };
  }
  return options;
}

export function resolveCateringShippingFee(
  form: Pick<CateringOrderReviewForm, "shipping_city" | "shipping_postal_code">,
  deliveryCities: DeliveryCity[],
  selfDeliveryFee: SelfDeliveryFee,
): number {
  return resolveSelfDeliveryShippingFee(
    form.shipping_city,
    form.shipping_postal_code,
    deliveryCities,
    selfDeliveryFee,
  );
}

function toPricingLines(items: CateringCartItem[]): CateringPricingLine[] {
  return cartItemsToGstPricingLines(
    items.map((item) => ({
      qty: item.qty,
      unitPrice: cateringCartLineUnitPrice(item),
      gstFree: item.gstFree,
    })),
  );
}

export function buildCateringOrderTotals(
  lines: CateringPricingLine[],
  options: {
    couponDiscount?: number;
    wholesaleDiscount?: number;
    shippingFee?: number;
    isGstInclusive?: boolean;
    gstTaxRate?: number;
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
  const isGstInclusive = options.isGstInclusive !== false;

  if (!isGstInclusive) {
    const totals = computeGstTotals({
      lines,
      gstTaxRate: options.gstTaxRate,
      couponDiscount: options.couponDiscount,
      wholesaleDiscount: options.wholesaleDiscount,
      shippingFee: options.shippingFee,
    });

    return {
      subtotal: totals.subtotalExGst,
      coupon_discount: totals.couponDiscount,
      wholesale_discount: totals.wholesaleDiscount,
      tax_total: totals.taxTotal,
      shipping_fee: totals.shippingFee,
      grand_total: totals.grandTotalIncGst,
    };
  }

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
  const grandTotal = Number((discountedSubtotal + shippingFee).toFixed(2));

  return {
    subtotal,
    coupon_discount: couponDiscount,
    wholesale_discount: wholesaleDiscount,
    tax_total: 0,
    shipping_fee: shippingFee,
    grand_total: grandTotal,
  };
}

export function withCateringOrderTotals(
  form: CateringOrderReviewForm,
  items: CateringCartItem[],
  options?: CommerceTaxSettings | CateringOrderTotalsOptions,
): CateringOrderReviewForm {
  const { tax, deliveryCities, selfDeliveryFee } = normalizeTotalsOptions(options);
  const shippingFee = isCateringPickup(form)
    ? 0
    : deliveryCities && selfDeliveryFee
      ? resolveCateringShippingFee(form, deliveryCities, selfDeliveryFee)
      : form.shipping_fee;

  return {
    ...form,
    ...buildCateringOrderTotals(toPricingLines(items), {
      couponDiscount: form.coupon_discount,
      wholesaleDiscount: form.wholesale_discount,
      shippingFee,
      isGstInclusive: tax?.isGstInclusive,
      gstTaxRate: tax?.gstTaxRate,
    }),
  };
}

export function buildCateringOrderReviewFromProfile(
  profile: UserProfile,
  customerEmail: string,
  items: CateringCartItem[],
  tax?: CommerceTaxSettings,
): CateringOrderReviewForm {
  const totals = buildCateringOrderTotals(toPricingLines(items), {
    isGstInclusive: tax?.isGstInclusive,
    gstTaxRate: tax?.gstTaxRate,
  });
  const billingCountry =
    trimmedOrEmpty(profile.billing_country) || WHOLESALE_DEFAULT_COUNTRY;
  const rawBillingState =
    trimmedOrEmpty(profile.billing_state) || DEFAULT_AUSTRALIAN_STATE_CODE;

  return {
    customer_name: getWholesaleContactName(profile),
    customer_email: customerEmail,
    customer_phone: trimmedOrEmpty(profile.phone),
    event_date: "",
    guest_count: "",
    requested_fulfillment_method: "delivery",
    requested_pick_up_store_id: null,
    shipping_dba_name: trimmedOrEmpty(profile.shipping_dba_name || profile.business_name),
    shipping_address: trimmedOrEmpty(profile.shipping_address),
    shipping_city: trimmedOrEmpty(profile.shipping_city),
    shipping_state:
      (profile.shipping_state as AustralianStateCode | null) ??
      DEFAULT_AUSTRALIAN_STATE_CODE,
    shipping_postal_code: trimmedOrEmpty(profile.shipping_postal_code),
    shipping_country: trimmedOrEmpty(profile.shipping_country) || WHOLESALE_DEFAULT_COUNTRY,
    shipping_preferred_window: trimmedOrEmpty(profile.shipping_preferred_window),
    billing_legal_name: trimmedOrEmpty(
      profile.billing_legal_name || profile.business_name,
    ),
    billing_tax_id: trimmedOrEmpty(profile.billing_tax_id) || null,
    billing_address: trimmedOrEmpty(profile.billing_address),
    billing_street_2: null,
    billing_city: trimmedOrEmpty(profile.billing_city),
    billing_state: isBillingCountryAustralia(billingCountry)
      ? normalizeBillingStateForAustralia(rawBillingState)
      : rawBillingState,
    billing_postal_code: trimmedOrEmpty(profile.billing_postal_code),
    billing_country: billingCountry,
    notes: null,
    coupon_code: null,
    ...totals,
  };
}

export function buildCateringOrderReviewForGuest(
  items: CateringCartItem[],
  tax?: CommerceTaxSettings,
): CateringOrderReviewForm {
  const totals = buildCateringOrderTotals(toPricingLines(items), {
    isGstInclusive: tax?.isGstInclusive,
    gstTaxRate: tax?.gstTaxRate,
  });

  return {
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    event_date: "",
    guest_count: "",
    requested_fulfillment_method: "delivery",
    requested_pick_up_store_id: null,
    shipping_dba_name: "",
    shipping_address: "",
    shipping_city: "",
    shipping_state: DEFAULT_AUSTRALIAN_STATE_CODE,
    shipping_postal_code: "",
    shipping_country: WHOLESALE_DEFAULT_COUNTRY,
    shipping_preferred_window: "",
    billing_legal_name: "",
    billing_tax_id: null,
    billing_address: "",
    billing_street_2: null,
    billing_city: "",
    billing_state: DEFAULT_AUSTRALIAN_STATE_CODE,
    billing_postal_code: "",
    billing_country: WHOLESALE_DEFAULT_COUNTRY,
    notes: null,
    coupon_code: null,
    ...totals,
  };
}

export type CateringPaymentFinancialDetails = {
  subtotal_ex_gst: number;
  gst_total: number;
  grand_total_inc_gst: number;
  shipping_fee: number;
  coupon_discount: number;
  wholesale_discount: number;
  coupon_code: string | null;
  currency: string;
};

export function buildCateringPaymentFinancialDetails(
  input: {
    subtotal: number;
    coupon_code?: string | null;
    coupon_discount?: number;
    wholesale_discount?: number;
    tax_total?: number;
    shipping_fee?: number;
    grand_total?: number;
    items?: Array<{ qty: number; unit_price: number }>;
  },
  tax?: CommerceTaxSettings,
): CateringPaymentFinancialDetails {
  const subtotalExGst =
    input.items && input.items.length > 0
      ? input.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
      : input.subtotal;
  const couponDiscount = input.coupon_discount ?? 0;
  const wholesaleDiscount = input.wholesale_discount ?? 0;
  const totalDiscount = couponDiscount + wholesaleDiscount;
  const shippingFee = input.shipping_fee ?? 0;
  const isGstInclusive = tax?.isGstInclusive !== false;
  const gstTotal = isGstInclusive ? 0 : (input.tax_total ?? 0);
  const grandTotal = Math.max(
    input.grand_total ??
      subtotalExGst - totalDiscount + gstTotal + shippingFee,
    0,
  );

  return {
    subtotal_ex_gst: Number(subtotalExGst.toFixed(2)),
    gst_total: Number(gstTotal.toFixed(2)),
    grand_total_inc_gst: Number(grandTotal.toFixed(2)),
    shipping_fee: Number(shippingFee.toFixed(2)),
    coupon_discount: Number(couponDiscount.toFixed(2)),
    wholesale_discount: Number(wholesaleDiscount.toFixed(2)),
    coupon_code: input.coupon_code ?? null,
    currency: "AUD",
  };
}

export function isCateringBillingSameAsShipping(
  form: CateringOrderReviewForm,
): boolean {
  return (
    form.billing_legal_name ===
      (form.shipping_dba_name.trim() || form.customer_name.trim()) &&
    form.billing_address === form.shipping_address &&
    (form.billing_street_2 ?? "") === "" &&
    form.billing_city === form.shipping_city &&
    form.billing_state === form.shipping_state &&
    form.billing_postal_code === form.shipping_postal_code &&
    form.billing_country ===
      (form.shipping_country.trim() || WHOLESALE_DEFAULT_COUNTRY)
  );
}

export function cateringBillingFromShippingForm(
  form: CateringOrderReviewForm,
): CateringOrderReviewForm {
  return {
    ...form,
    billing_legal_name: form.shipping_dba_name.trim() || form.customer_name.trim(),
    billing_address: form.shipping_address,
    billing_street_2: null,
    billing_city: form.shipping_city,
    billing_state: form.shipping_state,
    billing_postal_code: form.shipping_postal_code,
    billing_country: WHOLESALE_DEFAULT_COUNTRY,
    shipping_country: WHOLESALE_DEFAULT_COUNTRY,
  };
}

export function isCateringBillingComplete(
  form: CateringOrderReviewForm,
): boolean {
  return (
    form.billing_legal_name.trim().length > 0 &&
    form.billing_address.trim().length > 0 &&
    form.billing_city.trim().length > 0 &&
    form.billing_state.trim().length > 0 &&
    form.billing_postal_code.trim().length > 0 &&
    form.billing_country.trim().length > 0
  );
}

export function validateCateringOrderReview(
  form: CateringOrderReviewForm,
): string | null {
  if (!form.customer_name.trim()) return "Please enter your name.";
  if (!form.customer_email.trim()) return "Please enter your email.";
  if (!form.customer_phone.trim()) return "Please enter your phone number.";
  if (!form.event_date.trim()) return "Please select an event date.";
  if (isCateringPickup(form)) {
    if (!hasCateringPickupStoreSelected(form)) {
      return "Please select a pickup store.";
    }
  } else {
    if (!form.shipping_address.trim()) return "Delivery address is required.";
    if (!form.shipping_city.trim()) return "Delivery city is required.";
    if (!form.shipping_state.trim()) return "Delivery state is required.";
    if (!form.shipping_postal_code.trim()) return "Delivery postal code is required.";
  }
  if (!form.billing_legal_name.trim()) return "Billing legal name is required.";
  if (!form.billing_address.trim()) return "Billing street address is required.";
  if (!form.billing_city.trim()) return "Billing city is required.";
  if (!form.billing_state.trim()) return "Billing state is required.";
  if (!form.billing_postal_code.trim()) return "Billing postal code is required.";
  if (!form.billing_country.trim()) return "Billing country is required.";
  if (form.grand_total <= 0) return "Order total must be greater than zero.";
  return null;
}

export function serializeCateringOrderReviewForPlacement(
  form: CateringOrderReviewForm,
  tax?: CommerceTaxSettings,
) {
  const isGstInclusive = tax?.isGstInclusive !== false;
  const isPickup = isCateringPickup(form);
  const noteLines = [
    form.guest_count.trim() ? `Guest count: ${form.guest_count.trim()}` : null,
    !isPickup && form.shipping_preferred_window.trim()
      ? `Delivery window: ${form.shipping_preferred_window.trim()}`
      : null,
    form.notes?.trim() || null,
  ].filter(Boolean);

  return {
    customerName: form.customer_name.trim(),
    customerEmail: form.customer_email.trim(),
    customerPhone: form.customer_phone.trim(),
    fulfillmentType: (isPickup ? "pick_up" : "delivery") as OrderFulfillmentMethod,
    pickupTime: form.event_date.trim(),
    requestedPickUpStoreId: isPickup ? form.requested_pick_up_store_id : undefined,
    storeId: isPickup ? form.requested_pick_up_store_id ?? undefined : undefined,
    notes: noteLines.length > 0 ? noteLines.join("\n") : undefined,
    financialDetails: {
      subtotal_ex_gst: form.subtotal,
      gst_total: isGstInclusive ? 0 : form.tax_total,
      grand_total_inc_gst: form.grand_total,
      shipping_fee: form.shipping_fee,
      coupon_code: form.coupon_code,
      coupon_discount: form.coupon_discount,
      currency: "AUD",
    },
    billingAddress: {
      legal_name: form.billing_legal_name.trim(),
      street_1: form.billing_address.trim(),
      street_2: form.billing_street_2?.trim() || null,
      city: form.billing_city.trim(),
      state: form.billing_state,
      postal_code: form.billing_postal_code.trim(),
      country: form.billing_country.trim() || WHOLESALE_DEFAULT_COUNTRY,
      tax_id: form.billing_tax_id?.trim() || null,
      payment_terms: "prepaid",
    },
    ...(isPickup
      ? {}
      : {
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
        }),
  };
}

/** @deprecated Use serializeCateringOrderReviewForPlacement */
export const serializeCateringOrderReviewForCheckout =
  serializeCateringOrderReviewForPlacement;
