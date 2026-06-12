/** B2B wholesale order metadata stored on order headers (jsonb address + financial columns). */

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
  state?: string | null;
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
  state?: string | null;
  postal_code: string;
  country?: string | null;
  tax_id?: string | null;
  payment_terms?: string | null;
};

export type WholesaleOrderFinancialDetails = {
  subtotal_ex_gst: number;
  gst_total: number;
  grand_total_inc_gst: number;
  currency?: string;
};

export type WholesaleB2BCheckoutPayload = {
  buyer: WholesaleOrderBuyer;
  shippingAddress: WholesaleShippingAddress;
  billingAddress: WholesaleBillingAddress;
  financialDetails: WholesaleOrderFinancialDetails;
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
