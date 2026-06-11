import type { WholesaleCartItem } from "@/contexts/WholesaleCartContext";
import type { UserProfile } from "@/types";
import type {
  WholesaleB2BCheckoutPayload,
  WholesaleBillingAddress,
  WholesaleOrderB2B,
  WholesaleOrderBuyer,
  WholesaleOrderFinancialDetails,
  WholesaleShippingAddress,
} from "@/types/WholesaleB2BOrder";

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
  cartTotalExGst: number,
): WholesaleOrderFinancialDetails {
  const subtotal = Number(cartTotalExGst.toFixed(2));
  const gst = Number((subtotal * 0.1).toFixed(2));
  return {
    subtotal_ex_gst: subtotal,
    gst_total: gst,
    grand_total_inc_gst: Number((subtotal + gst).toFixed(2)),
    currency: "AUD",
  };
}

export function buildWholesaleB2BFromProfile(
  profile: UserProfile,
  email: string,
): WholesaleB2BCheckoutPayload {
  const city = profile.city?.trim() || profile.suburb?.trim() || "";
  const buyer: WholesaleOrderBuyer = {
    name: getWholesaleContactName(profile),
    role: profile.business_category?.trim() || null,
    contact_phone: profile.phone?.trim() ?? "",
    contact_email: email,
  };

  const shippingAddress: WholesaleShippingAddress = {
    dba_name: profile.business_name?.trim() || buyer.name,
    street_1: profile.address_line1?.trim() ?? "",
    street_2: profile.address_line2?.trim() || null,
    city,
    state: profile.state?.trim() || null,
    postal_code: profile.postal_code?.trim() ?? "",
    country: profile.country?.trim() || "Australia",
    special_instructions: null,
    preferred_window: null,
  };

  const billingAddress: WholesaleBillingAddress = {
    legal_name: profile.business_name?.trim() || buyer.name,
    street_1: profile.address_line1?.trim() ?? "",
    street_2: profile.address_line2?.trim() || null,
    city,
    state: profile.state?.trim() || null,
    postal_code: profile.postal_code?.trim() ?? "",
    country: profile.country?.trim() || "Australia",
    tax_id: profile.abn?.trim() || null,
    payment_terms: "PREPAID",
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
    state: optionalString(row.state),
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
    state: optionalString(row.state),
    postal_code,
    country: optionalString(row.country),
    tax_id: optionalString(row.tax_id),
    payment_terms: optionalString(row.payment_terms),
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
  return {
    subtotal_ex_gst: Number.isFinite(subtotal) ? subtotal : 0,
    gst_total: Number.isFinite(gst) ? gst : 0,
    grand_total_inc_gst: Number.isFinite(grand) ? grand : 0,
    currency: optionalString(row.currency) ?? "AUD",
  };
}

export function parseWholesaleOrderB2B(row: {
  buyer?: unknown;
  shipping_address?: unknown;
  billing_address?: unknown;
  financial_details?: unknown;
}): WholesaleOrderB2B {
  return {
    buyer: parseWholesaleOrderBuyer(row.buyer),
    shippingAddress: parseWholesaleShippingAddress(row.shipping_address),
    billingAddress: parseWholesaleBillingAddress(row.billing_address),
    financialDetails: parseWholesaleFinancialDetails(row.financial_details),
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

export function formatWholesalePaymentTerms(terms: string | null | undefined): string {
  if (!terms) return "—";
  if (terms === "PREPAID") return "Prepaid";
  if (terms.startsWith("NET_")) {
    return `Net ${terms.slice(4)} days`;
  }
  return terms.replaceAll("_", " ");
}

export function formatWholesaleStreetAddress(
  address: Pick<
    WholesaleShippingAddress,
    "street_1" | "street_2" | "city" | "state" | "postal_code" | "country"
  >,
): string[] {
  const locality = [
    address.city,
    address.state,
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
