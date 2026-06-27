import type { WholesaleCartItem } from "@/contexts/WholesaleCartContext";
import { computeWholesaleTierDiscount } from "@/lib/wholesale-tier-discount";
import type { UserProfile, WholesalePricingTier } from "@/types";
import type {
  WholesaleB2BCheckoutPayload,
  WholesaleBillingAddress,
  WholesaleOrderB2B,
  WholesaleOrderBuyer,
  WholesaleOrderFinancialDetails,
  WholesaleOrderReviewForm,
  OrderFulfillmentMethod,
  OrderPaymentTerms,
  AustralianStateCode,
  WholesaleShippingAddress,
} from "@/types/WholesaleB2BOrder";
import {
  isBillingCountryAustralia,
  normalizeBillingStateForAustralia,
} from "@/lib/billing-address";

function optionalString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function requiredString(value: unknown): string {
  return String(value ?? "").trim();
}

export function getWholesaleContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

export function billingAddressFromShipping(
  shipping: WholesaleShippingAddress,
  billing: WholesaleBillingAddress,
): WholesaleBillingAddress {
  return {
    legal_name: shipping.dba_name,
    street_1: shipping.street_1,
    street_2: shipping.street_2,
    city: shipping.city,
    state: shipping.state,
    postal_code: shipping.postal_code,
    country: shipping.country,
    tax_id: billing.tax_id,
    payment_terms: billing.payment_terms,
  };
}

export function isBillingSameAsShipping(
  shipping: WholesaleShippingAddress,
  billing: WholesaleBillingAddress,
): boolean {
  return (
    billing.legal_name === shipping.dba_name &&
    billing.street_1 === shipping.street_1 &&
    (billing.street_2 ?? "") === (shipping.street_2 ?? "") &&
    billing.city === shipping.city &&
    (billing.state ?? "") === (shipping.state ?? "") &&
    billing.postal_code === shipping.postal_code &&
    (billing.country ?? "") === (shipping.country ?? "")
  );
}

export function buildWholesaleFinancialDetails(
  cartTotalIncGst: number,
  tax?: { isGstInclusive: boolean; gstTaxRate: number },
): WholesaleOrderFinancialDetails {
  const subtotal = Number(cartTotalIncGst.toFixed(2));
  if (tax?.isGstInclusive === false) {
    const gst = Number((subtotal * tax.gstTaxRate).toFixed(2));
    return {
      subtotal_ex_gst: subtotal,
      gst_total: gst,
      grand_total_inc_gst: Number((subtotal + gst).toFixed(2)),
      currency: "AUD",
    };
  }
  return {
    subtotal_ex_gst: subtotal,
    gst_total: 0,
    grand_total_inc_gst: subtotal,
    currency: "AUD",
  };
}

export const AUSTRALIAN_STATES: {
  value: AustralianStateCode;
  label: string;
  active: boolean;
}[] = [
  { value: "ACT", label: "Australian Capital Territory", active: false },
  { value: "NSW", label: "New South Wales", active: false },
  { value: "NT", label: "Northern Territory", active: false },
  { value: "QLD", label: "Queensland", active: false },
  { value: "SA", label: "South Australia", active: false },
  { value: "TAS", label: "Tasmania", active: true },
  { value: "VIC", label: "Victoria", active: false },
  { value: "WA", label: "Western Australia", active: false },
];

export function getDeliveryAustralianStateOptions(): Array<{
  value: AustralianStateCode;
  label: string;
}> {
  return AUSTRALIAN_STATES.filter((state) => state.active).map((state) => ({
    value: state.value,
    label: state.label,
  }));
}

export function getBillingAustralianStateOptions(): Array<{
  value: AustralianStateCode;
  label: string;
}> {
  return AUSTRALIAN_STATES.map((state) => ({
    value: state.value,
    label: state.label,
  }));
}

function isAustralianStateCode(value: string): value is AustralianStateCode {
  return AUSTRALIAN_STATES.some((state) => state.value === value);
}

function parseAustralianStateCode(value: unknown): AustralianStateCode | null {
  if (value == null) return null;
  const raw = String(value).trim();
  return isAustralianStateCode(raw) ? raw : null;
}

export const WHOLESALE_DEFAULT_COUNTRY = "Australia";

export const WHOLESALE_FULFILLMENT_OPTIONS: {
  value: OrderFulfillmentMethod;
  label: string;
}[] = [
  { value: "shipping", label: "Ship to you" },
  { value: "pick_up", label: "Pick up at a store" },
];

export const WHOLESALE_PAYMENT_TERMS_OPTIONS: {
  value: OrderPaymentTerms;
  label: string;
}[] = [
  { value: "prepaid", label: "Prepaid" },
  { value: "due_on_receipt", label: "Due on receipt" },
  { value: "deposit_required", label: "Deposit required" },
  { value: "net_30", label: "Net 30" },
  { value: "net_60", label: "Net 60" },
  { value: "net_90", label: "Net 90" },
];

function isOrderPaymentTerms(value: string): value is OrderPaymentTerms {
  return WHOLESALE_PAYMENT_TERMS_OPTIONS.some((option) => option.value === value);
}

function parseOrderPaymentTerms(value: unknown): OrderPaymentTerms | null {
  if (value == null) return null;
  const raw = String(value).trim();
  return isOrderPaymentTerms(raw) ? raw : null;
}

export function defaultRequestedTargetDateLocal(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function requestedTargetDateLocalToIso(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T09:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }
  return new Date(parsed).toISOString();
}

export function buildWholesaleOrderTotals(
  lines: { qty: number; unitPriceExGst: number; gstFree?: boolean }[],
  pricingTiers: WholesalePricingTier[] = [],
  shippingFee = 0,
  tax?: { isGstInclusive: boolean; gstTaxRate: number },
): Pick<
  WholesaleOrderReviewForm,
  "subtotal" | "wholesale_discount" | "tax_total" | "shipping_fee" | "grand_total"
> {
  const totals = computeWholesaleTierDiscount(
    lines,
    pricingTiers,
    shippingFee,
    tax,
  );
  return {
    subtotal: totals.subtotalExGst,
    wholesale_discount: totals.wholesaleDiscount,
    tax_total: totals.taxTotal,
    shipping_fee: totals.shippingFee,
    grand_total: totals.grandTotal,
  };
}

export function buildWholesaleOrderReviewFromProfile(
  profile: UserProfile,
  email: string,
  cartTotalExGst: number,
  pricingTiers: WholesalePricingTier[] = [],
): WholesaleOrderReviewForm {
  const customer_name = getWholesaleContactName(profile);
  const personalCity = profile.city?.trim() || profile.suburb?.trim() || "";
  const personalStreet = profile.address_line1?.trim() ?? "";
  const businessName = profile.business_name?.trim() || customer_name;
  const shippingDbaName =
    profile.shipping_dba_name?.trim() || businessName;
  const shippingStreet =
    profile.shipping_address?.trim() || personalStreet;
  const shippingCity = profile.shipping_city?.trim() || personalCity;
  const billingLegalName =
    profile.billing_legal_name?.trim() || businessName;
  const billingStreet =
    profile.billing_address?.trim() || personalStreet;
  const billingCity = profile.billing_city?.trim() || personalCity;
  const billingCountry =
    profile.billing_country?.trim() || WHOLESALE_DEFAULT_COUNTRY;
  const rawBillingState =
    profile.billing_state?.trim() ||
    parseAustralianStateCode(profile.state) ||
    "TAS";

  return {
    customer_name,
    customer_email: email,
    customer_phone: profile.phone?.trim() ?? "",
    requested_fulfillment_method: "pick_up",
    requested_target_date: defaultRequestedTargetDateLocal(),
    requested_pick_up_store_id: null,
    shipping_dba_name: shippingDbaName,
    shipping_address: shippingStreet,
    shipping_street_2: profile.address_line2?.trim() || null,
    shipping_city: shippingCity,
    shipping_state:
      parseAustralianStateCode(profile.shipping_state ?? profile.state) ?? "TAS",
    shipping_postal_code:
      profile.shipping_postal_code?.trim() ||
      profile.postal_code?.trim() ||
      "",
    shipping_country: WHOLESALE_DEFAULT_COUNTRY,
    shipping_special_instructions: null,
    shipping_preferred_window: profile.shipping_preferred_window?.trim() || null,
    billing_legal_name: billingLegalName,
    billing_address: billingStreet,
    billing_street_2: profile.address_line2?.trim() || null,
    billing_city: billingCity,
    billing_state: isBillingCountryAustralia(billingCountry)
      ? normalizeBillingStateForAustralia(rawBillingState)
      : rawBillingState,
    billing_postal_code:
      profile.billing_postal_code?.trim() ||
      profile.postal_code?.trim() ||
      "",
    billing_country: billingCountry,
    billing_tax_id:
      profile.billing_tax_id?.trim() || profile.abn?.trim() || null,
    payment_terms: "prepaid",
    po_number: null,
    notes: null,
    ...buildWholesaleOrderTotals(
      [{ qty: 1, unitPriceExGst: cartTotalExGst }],
      pricingTiers,
    ),
  };
}

export function isBillingSameAsShippingForm(
  form: WholesaleOrderReviewForm,
): boolean {
  return (
    form.billing_legal_name === form.shipping_dba_name &&
    form.billing_address === form.shipping_address &&
    (form.billing_street_2 ?? "") === (form.shipping_street_2 ?? "") &&
    form.billing_city === form.shipping_city &&
    form.billing_state === form.shipping_state &&
    form.billing_postal_code === form.shipping_postal_code &&
    form.billing_country === form.shipping_country
  );
}

export function billingFromShippingForm(
  form: WholesaleOrderReviewForm,
): WholesaleOrderReviewForm {
  return {
    ...form,
    billing_legal_name: form.shipping_dba_name,
    billing_address: form.shipping_address,
    billing_street_2: form.shipping_street_2,
    billing_city: form.shipping_city,
    billing_state: form.shipping_state,
    billing_postal_code: form.shipping_postal_code,
    billing_country: WHOLESALE_DEFAULT_COUNTRY,
    shipping_country: WHOLESALE_DEFAULT_COUNTRY,
  };
}

export function hasWholesalePickupStoreSelected(
  form: Pick<
    WholesaleOrderReviewForm,
    "requested_fulfillment_method" | "requested_pick_up_store_id"
  >,
): boolean {
  if (form.requested_fulfillment_method !== "pick_up") return true;
  const id = form.requested_pick_up_store_id;
  return id != null && Number.isFinite(id) && id > 0;
}

export function validateWholesaleOrderReview(
  form: WholesaleOrderReviewForm,
): string | null {
  if (!form.customer_name.trim()) return "Customer name is required.";
  if (!form.customer_email.trim()) return "Customer email is required.";
  if (!form.customer_phone.trim()) return "Customer phone is required.";
  if (!form.requested_target_date.trim()) {
    return "Requested delivery date is required.";
  }
  if (
    form.requested_fulfillment_method === "pick_up" &&
    !hasWholesalePickupStoreSelected(form)
  ) {
    return "Please select a pickup store before checkout.";
  }
  if (form.requested_fulfillment_method !== "pick_up") {
    if (!form.shipping_address.trim()) return "Shipping street address is required.";
    if (!form.shipping_city.trim()) return "Shipping city is required.";
    if (!form.shipping_state.trim()) return "Shipping state is required.";
    if (!form.shipping_postal_code.trim()) {
      return "Shipping postal code is required.";
    }
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

export function serializeWholesaleOrderReviewForCheckout(
  form: WholesaleOrderReviewForm,
) {
  const isPickup = form.requested_fulfillment_method === "pick_up";

  const shippingAddress: WholesaleShippingAddress | undefined = isPickup
    ? undefined
    : {
        dba_name: form.shipping_dba_name.trim(),
        street_1: form.shipping_address.trim(),
        street_2: form.shipping_street_2?.trim() || null,
        city: form.shipping_city.trim(),
        state: form.shipping_state,
        postal_code: form.shipping_postal_code.trim(),
        country: WHOLESALE_DEFAULT_COUNTRY,
        special_instructions: form.shipping_special_instructions?.trim() || null,
        preferred_window: form.shipping_preferred_window?.trim() || null,
      };

  const billingAddress: WholesaleBillingAddress = {
    legal_name: form.billing_legal_name.trim(),
    street_1: form.billing_address.trim(),
    street_2: form.billing_street_2?.trim() || null,
    city: form.billing_city.trim(),
    state: form.billing_state.trim(),
    postal_code: form.billing_postal_code.trim(),
    country: form.billing_country.trim() || WHOLESALE_DEFAULT_COUNTRY,
    tax_id: form.billing_tax_id?.trim() || null,
    payment_terms: form.payment_terms,
  };

  const financialDetails: WholesaleOrderFinancialDetails = {
    subtotal_ex_gst: form.subtotal,
    gst_total: form.tax_total,
    grand_total_inc_gst: form.grand_total,
    shipping_fee: form.shipping_fee,
    currency: "AUD",
  };

  return {
    fulfillmentType: form.requested_fulfillment_method,
    pickupTime: requestedTargetDateLocalToIso(form.requested_target_date),
    requestedPickUpStoreId: form.requested_pick_up_store_id,
    storeId:
      form.requested_fulfillment_method === "pick_up"
        ? form.requested_pick_up_store_id
        : undefined,
    notes: form.notes?.trim() || undefined,
    poNumber: form.po_number?.trim() || undefined,
    customerName: form.customer_name.trim(),
    customerEmail: form.customer_email.trim(),
    customerPhone: form.customer_phone.trim(),
    buyer: {
      name: form.customer_name.trim(),
      role: null,
      contact_phone: form.customer_phone.trim(),
      contact_email: form.customer_email.trim() || null,
    },
    shippingAddress,
    billingAddress,
    financialDetails,
  };
}

export function buildWholesaleB2BFromProfile(
  profile: UserProfile,
  email: string,
): WholesaleB2BCheckoutPayload {
  const personalCity = profile.city?.trim() || profile.suburb?.trim() || "";
  const personalStreet = profile.address_line1?.trim() ?? "";
  const businessName = profile.business_name?.trim() || getWholesaleContactName(profile);
  const buyer: WholesaleOrderBuyer = {
    name: getWholesaleContactName(profile),
    role: profile.business_category?.trim() || null,
    contact_phone: profile.phone?.trim() ?? "",
    contact_email: email,
  };

  const shippingAddress: WholesaleShippingAddress = {
    dba_name: profile.shipping_dba_name?.trim() || businessName,
    street_1: profile.shipping_address?.trim() || personalStreet,
    street_2: profile.address_line2?.trim() || null,
    city: profile.shipping_city?.trim() || personalCity,
    state: parseAustralianStateCode(profile.shipping_state ?? profile.state),
    postal_code:
      profile.shipping_postal_code?.trim() ||
      profile.postal_code?.trim() ||
      "",
    country:
      profile.shipping_country?.trim() ||
      profile.country?.trim() ||
      "Australia",
    special_instructions: null,
    preferred_window: profile.shipping_preferred_window?.trim() || null,
  };

  const billingAddress: WholesaleBillingAddress = {
    legal_name: profile.billing_legal_name?.trim() || businessName,
    street_1: profile.billing_address?.trim() || personalStreet,
    street_2: profile.address_line2?.trim() || null,
    city: profile.billing_city?.trim() || personalCity,
    state: parseAustralianStateCode(profile.billing_state ?? profile.state),
    postal_code:
      profile.billing_postal_code?.trim() ||
      profile.postal_code?.trim() ||
      "",
    country:
      profile.billing_country?.trim() ||
      profile.country?.trim() ||
      "Australia",
    tax_id: profile.billing_tax_id?.trim() || profile.abn?.trim() || null,
    payment_terms: "prepaid",
  };

  return {
    buyer,
    shippingAddress,
    billingAddress,
    financialDetails: buildWholesaleFinancialDetails(0),
  };
}

export function validateWholesaleB2BReview(
  payload: WholesaleB2BCheckoutPayload,
): string | null {
  if (!payload.buyer.name.trim()) return "Buyer name is required.";
  if (!payload.buyer.contact_phone.trim()) {
    return "Buyer contact phone is required.";
  }
  if (!payload.shippingAddress.street_1.trim()) {
    return "Shipping street address is required.";
  }
  if (!payload.shippingAddress.city.trim()) {
    return "Shipping city is required.";
  }
  if (!payload.shippingAddress.postal_code.trim()) {
    return "Shipping postal code is required.";
  }
  if (!payload.billingAddress.legal_name.trim()) {
    return "Billing legal name is required.";
  }
  if (!payload.billingAddress.street_1.trim()) {
    return "Billing street address is required.";
  }
  if (!payload.billingAddress.city.trim()) {
    return "Billing city is required.";
  }
  if (!payload.billingAddress.postal_code.trim()) {
    return "Billing postal code is required.";
  }
  return null;
}

export function serializeWholesaleB2BForCheckout(
  payload: WholesaleB2BCheckoutPayload,
) {
  return {
    buyer: payload.buyer,
    shippingAddress: payload.shippingAddress,
    billingAddress: payload.billingAddress,
    financialDetails: payload.financialDetails,
  };
}

export function lineTotalIncGst(item: WholesaleCartItem): number {
  return Number((Number(item.unitPrice) * item.qty * 1.1).toFixed(2));
}

export function parseWholesaleOrderBuyer(
  value: unknown,
): WholesaleOrderBuyer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const name = requiredString(row.name);
  if (!name) return null;
  return {
    name,
    role: optionalString(row.role),
    contact_phone: requiredString(row.contact_phone),
    contact_email: optionalString(row.contact_email),
  };
}

export function parseWholesaleShippingAddress(
  value: unknown,
): WholesaleShippingAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const street_1 = requiredString(row.street_1);
  const city = requiredString(row.city);
  const postal_code = requiredString(row.postal_code);
  if (!street_1 && !city && !postal_code) return null;
  return {
    dba_name: requiredString(row.dba_name) || "—",
    street_1,
    street_2: optionalString(row.street_2),
    city,
    state: parseAustralianStateCode(row.state),
    postal_code,
    country: optionalString(row.country),
    special_instructions: optionalString(row.special_instructions),
    preferred_window: optionalString(row.preferred_window),
  };
}

export function parseWholesaleBillingAddress(
  value: unknown,
): WholesaleBillingAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const street_1 = requiredString(row.street_1);
  const city = requiredString(row.city);
  const postal_code = requiredString(row.postal_code);
  const legal_name = requiredString(row.legal_name);
  if (!legal_name && !street_1 && !city && !postal_code) return null;
  return {
    legal_name: legal_name || "—",
    street_1,
    street_2: optionalString(row.street_2),
    city,
    state: parseAustralianStateCode(row.state),
    postal_code,
    country: optionalString(row.country),
    tax_id: optionalString(row.tax_id),
    payment_terms: parseOrderPaymentTerms(row.payment_terms),
  };
}

export function parseWholesaleFinancialDetails(
  value: unknown,
): WholesaleOrderFinancialDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const subtotal = Number(row.subtotal_ex_gst);
  const gst = Number(row.gst_total);
  const grand = Number(row.grand_total_inc_gst);
  if (!Number.isFinite(subtotal) && !Number.isFinite(grand)) return null;
  const shippingFee = Number(row.shipping_fee);
  return {
    subtotal_ex_gst: Number.isFinite(subtotal) ? subtotal : 0,
    gst_total: Number.isFinite(gst) ? gst : 0,
    grand_total_inc_gst: Number.isFinite(grand) ? grand : 0,
    shipping_fee: Number.isFinite(shippingFee) ? shippingFee : undefined,
    currency: optionalString(row.currency) ?? "AUD",
  };
}

export type OrderFinancialDbRow = {
  subtotal?: number | string | null;
  coupon_code?: string | null;
  coupon_discount?: number | string | null;
  wholesale_discount?: number | string | null;
  tax_total?: number | string | null;
  shipping_fee?: number | string | null;
  grand_total?: number | string | null;
};

/** Build tooltip/dialog totals from orders.subtotal, tax_total, shipping_fee, grand_total. */
export function parseWholesaleFinancialDetailsFromOrderRow(
  row: OrderFinancialDbRow,
): WholesaleOrderFinancialDetails | null {
  const subtotal = Number(row.subtotal);
  const wholesaleDiscount = Number(row.wholesale_discount ?? 0);
  const couponDiscount = Number(row.coupon_discount ?? 0);
  const couponCode = optionalString(row.coupon_code);
  const taxTotal = Number(row.tax_total);
  const shippingFee = Number(row.shipping_fee ?? 0);
  const grandTotal = Number(row.grand_total);

  if (
    !Number.isFinite(grandTotal) &&
    !Number.isFinite(subtotal) &&
    !Number.isFinite(taxTotal)
  ) {
    return null;
  }

  const resolvedTax = Number.isFinite(taxTotal) ? taxTotal : 0;
  const resolvedWholesaleDiscount = Number.isFinite(wholesaleDiscount)
    ? Math.max(wholesaleDiscount, 0)
    : 0;
  const resolvedCouponDiscount = Number.isFinite(couponDiscount)
    ? Math.max(couponDiscount, 0)
    : 0;
  const resolvedSubtotal = Number.isFinite(subtotal)
    ? subtotal
    : Number.isFinite(grandTotal)
      ? Math.max(
          grandTotal -
            resolvedTax -
            shippingFee +
            resolvedWholesaleDiscount +
            resolvedCouponDiscount,
          0,
        )
      : 0;
  const resolvedGrand = Number.isFinite(grandTotal)
    ? grandTotal
    : resolvedSubtotal -
      resolvedWholesaleDiscount -
      resolvedCouponDiscount +
      resolvedTax +
      shippingFee;

  if (resolvedGrand <= 0 && resolvedSubtotal <= 0) {
    return null;
  }

  return {
    subtotal_ex_gst: resolvedSubtotal,
    gst_total: resolvedTax,
    shipping_fee: shippingFee > 0 ? shippingFee : undefined,
    grand_total_inc_gst: resolvedGrand,
    wholesale_discount:
      resolvedWholesaleDiscount > 0 ? resolvedWholesaleDiscount : undefined,
    coupon_discount: resolvedCouponDiscount > 0 ? resolvedCouponDiscount : undefined,
    coupon_code: couponCode ?? undefined,
    currency: "AUD",
  };
}

export type OrderAddressDbRow = OrderFinancialDbRow & {
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  payment_terms?: string | null;
  shipping_dba_name?: string | null;
  shipping_special_instructions?: string | null;
  shipping_preferred_window?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  billing_legal_name?: string | null;
  billing_tax_id?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
};

export type OrderFlatAddress = {
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: string;
};

export function isPlaceholderAddressValue(value: string | null | undefined): boolean {
  const trimmed = String(value ?? "").trim();
  return (
    !trimmed ||
    trimmed === "N/A" ||
    trimmed === "0000" ||
    trimmed === "In-store pickup"
  );
}

function australianStateLabel(code: string | null | undefined): string | null {
  if (!code || isPlaceholderAddressValue(code)) return null;
  return AUSTRALIAN_STATES.find((state) => state.value === code)?.label ?? code;
}

export function extractOrderFlatAddress(row: OrderAddressDbRow): OrderFlatAddress {
  return {
    shipping_address: requiredString(row.shipping_address),
    shipping_city: requiredString(row.shipping_city),
    shipping_state: requiredString(row.shipping_state),
    shipping_postal_code: requiredString(row.shipping_postal_code),
    shipping_country: requiredString(row.shipping_country),
    billing_address: requiredString(row.billing_address),
    billing_city: requiredString(row.billing_city),
    billing_state: requiredString(row.billing_state),
    billing_postal_code: requiredString(row.billing_postal_code),
    billing_country: requiredString(row.billing_country),
  };
}

export function formatFlatAddressLines(parts: {
  line: string;
  city: string;
  state?: string | null;
  postal_code: string;
  country?: string | null;
}): string[] {
  const locality = [
    parts.city,
    australianStateLabel(parts.state),
    parts.postal_code,
    parts.country,
  ]
    .filter((part) => part && !isPlaceholderAddressValue(part))
    .join(", ");

  return [parts.line, locality].filter(
    (line) => line && !isPlaceholderAddressValue(line),
  );
}

export function formatFlatShippingLines(address: OrderFlatAddress): string[] {
  return formatFlatAddressLines({
    line: address.shipping_address,
    city: address.shipping_city,
    state: address.shipping_state,
    postal_code: address.shipping_postal_code,
    country: address.shipping_country,
  });
}

export function formatFlatBillingLines(address: OrderFlatAddress): string[] {
  return formatFlatAddressLines({
    line: address.billing_address,
    city: address.billing_city,
    state: address.billing_state,
    postal_code: address.billing_postal_code,
    country: address.billing_country,
  });
}

export function hasMeaningfulFlatShippingAddress(
  address: OrderFlatAddress,
): boolean {
  return formatFlatShippingLines(address).length > 0;
}

export function hasMeaningfulFlatBillingAddress(
  address: OrderFlatAddress,
): boolean {
  return formatFlatBillingLines(address).length > 0;
}

function parseWholesaleShippingFromFlatRow(
  row: OrderAddressDbRow,
): WholesaleShippingAddress | null {
  const flat = extractOrderFlatAddress(row);
  if (!hasMeaningfulFlatShippingAddress(flat)) return null;

  const street = flat.shipping_address;
  const city = flat.shipping_city;
  const postalCode = flat.shipping_postal_code;

  return {
    dba_name: optionalString(row.shipping_dba_name) || requiredString(row.customer_name) || "—",
    street_1: street || "—",
    street_2: null,
    city: city || "—",
    state: parseAustralianStateCode(row.shipping_state),
    postal_code: postalCode || "—",
    country: optionalString(row.shipping_country),
    special_instructions: optionalString(row.shipping_special_instructions),
    preferred_window: optionalString(row.shipping_preferred_window),
  };
}

function parseWholesaleBillingFromFlatRow(
  row: OrderAddressDbRow,
): WholesaleBillingAddress | null {
  const flat = extractOrderFlatAddress(row);
  if (!hasMeaningfulFlatBillingAddress(flat)) return null;

  const street = flat.billing_address;
  const city = flat.billing_city;
  const postalCode = flat.billing_postal_code;

  return {
    legal_name: optionalString(row.billing_legal_name) || requiredString(row.customer_name) || "—",
    street_1: street || "—",
    street_2: null,
    city: city || "—",
    state: parseAustralianStateCode(row.billing_state),
    postal_code: postalCode || "—",
    country: optionalString(row.billing_country),
    tax_id: optionalString(row.billing_tax_id),
    payment_terms: parseOrderPaymentTerms(row.payment_terms),
  };
}

function hasFlatAddressColumns(row: OrderAddressDbRow): boolean {
  const flat = extractOrderFlatAddress(row);
  return (
    hasMeaningfulFlatShippingAddress(flat) ||
    hasMeaningfulFlatBillingAddress(flat) ||
    typeof row.shipping_city === "string" ||
    typeof row.billing_city === "string"
  );
}

export function parseWholesaleOrderB2B(
  row: OrderAddressDbRow & { buyer?: unknown },
): WholesaleOrderB2B {
  const financialDetails = parseWholesaleFinancialDetailsFromOrderRow(row);

  if (hasFlatAddressColumns(row)) {
    return {
      buyer: parseWholesaleOrderBuyer(row.buyer),
      shippingAddress: parseWholesaleShippingFromFlatRow(row),
      billingAddress: parseWholesaleBillingFromFlatRow(row),
      financialDetails,
    };
  }

  return {
    buyer: parseWholesaleOrderBuyer(row.buyer),
    shippingAddress: parseWholesaleShippingAddress(row.shipping_address),
    billingAddress: parseWholesaleBillingAddress(row.billing_address),
    financialDetails,
  };
}

export function hasWholesaleOrderB2B(b2b: WholesaleOrderB2B): boolean {
  return !!(
    b2b.buyer ||
    b2b.shippingAddress ||
    b2b.billingAddress ||
    b2b.financialDetails
  );
}

export function formatWholesaleStreetAddress(
  address: Pick<
    WholesaleShippingAddress,
    "street_1" | "street_2" | "city" | "state" | "postal_code" | "country"
  >,
): string[] {
  const locality = [
    address.city,
    australianStateLabel(address.state),
    address.postal_code,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  return [address.street_1, address.street_2, locality].filter(
    (line): line is string => Boolean(line?.trim()),
  );
}

export function getWholesaleOrderB2BSummary(b2b: WholesaleOrderB2B): string | null {
  const parts: string[] = [];
  if (b2b.buyer?.name) parts.push(b2b.buyer.name);
  if (b2b.shippingAddress?.dba_name) parts.push(b2b.shippingAddress.dba_name);
  if (b2b.shippingAddress?.city) parts.push(b2b.shippingAddress.city);
  return parts.length > 0 ? parts.join(" · ") : null;
}
