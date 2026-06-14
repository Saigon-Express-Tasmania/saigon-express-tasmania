/** B2B wholesale order metadata stored on order headers (jsonb address + financial columns). */

/** Matches public.order_payment_terms in Postgres. */
export type OrderPaymentTerms =
  | "prepaid"
  | "due_on_receipt"
  | "deposit_required"
  | "net_30"
  | "net_60"
  | "net_90";

/** Australian state/territory codes stored on order address columns. */
export type AustralianStateCode =
  | "ACT"
  | "NSW"
  | "NT"
  | "QLD"
  | "SA"
  | "TAS"
  | "VIC"
  | "WA";

export type WholesaleOrderBuyer = {
  name: string;
  role?: string | null;
  contact_phone: string;
  contact_email?: string | null;
};

export type WholesaleShippingAddress = {
  dba_name: string;
  street_1: string;
  street_2?: string | null;
  city: string;
  state?: AustralianStateCode | null;
  postal_code: string;
  country?: string | null;
  special_instructions?: string | null;
  preferred_window?: string | null;
};

export type WholesaleBillingAddress = {
  legal_name: string;
  street_1: string;
  street_2?: string | null;
  city: string;
  state?: AustralianStateCode | null;
  postal_code: string;
  country?: string | null;
  tax_id?: string | null;
  payment_terms?: OrderPaymentTerms | null;
};

export type WholesaleOrderFinancialDetails = {
  subtotal_ex_gst: number;
  gst_total: number;
  grand_total_inc_gst: number;
  shipping_fee?: number;
  coupon_code?: string;
  coupon_discount?: number;
  wholesale_discount?: number;
  currency?: string;
};

export type WholesaleB2BCheckoutPayload = {
  buyer: WholesaleOrderBuyer;
  shippingAddress: WholesaleShippingAddress;
  billingAddress: WholesaleBillingAddress;
  financialDetails: WholesaleOrderFinancialDetails;
};

/** Wholesale checkout review aligned with public.orders header columns. */
export type OrderFulfillmentMethod = "pick_up" | "delivery" | "shipping";

export type WholesaleOrderReviewForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  requested_fulfillment_method: OrderFulfillmentMethod;
  requested_target_date: string;
  requested_pick_up_store_id: number | null;
  shipping_address: string;
  shipping_street_2: string | null;
  shipping_city: string;
  shipping_state: AustralianStateCode;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_dba_name: string;
  shipping_special_instructions: string | null;
  shipping_preferred_window: string | null;
  billing_address: string;
  billing_street_2: string | null;
  billing_city: string;
  billing_state: AustralianStateCode;
  billing_postal_code: string;
  billing_country: string;
  billing_legal_name: string;
  billing_tax_id: string | null;
  payment_terms: OrderPaymentTerms;
  po_number: string | null;
  notes: string | null;
  subtotal: number;
  wholesale_discount: number;
  tax_total: number;
  shipping_fee: number;
  grand_total: number;
};

/** Parsed B2B metadata from order header jsonb columns. */
export type WholesaleOrderB2B = {
  buyer: WholesaleOrderBuyer | null;
  shippingAddress: WholesaleShippingAddress | null;
  billingAddress: WholesaleBillingAddress | null;
  financialDetails: WholesaleOrderFinancialDetails | null;
};

export type WholesaleOrderB2BSection =
  | "buyer"
  | "shipping"
  | "billing"
  | "financials"
  | "all";
