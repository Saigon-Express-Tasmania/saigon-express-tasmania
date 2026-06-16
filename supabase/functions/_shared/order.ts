import type Stripe from "npm:stripe@17.7.0";
import { createServiceClient } from "./supabase.ts";
import {
  computeWholesaleTierDiscountTotals,
  type WholesaleTierRow,
} from "./wholesale-tier-discount.ts";
import { resolveWholesaleShippingFee } from "./wholesale-freight.ts";
import {
  createStripeClient,
  type StripePaymentMode,
  parsePaymentMode,
} from "./stripe.ts";

export type { StripePaymentMode };

export type OrderType = "pickup" | "wholesale" | "catering";

export type OrderFulfillmentType = "pick_up" | "delivery" | "shipping";

export type OrderCheckoutItem = {
  productId: number;
  qty: number;
  unitPrice: number;
  itemName: string;
};

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

export type WholesaleFinancialDetails = {
  subtotal_ex_gst: number;
  gst_total: number;
  grand_total_inc_gst: number;
  shipping_fee?: number;
  coupon_code?: string;
  coupon_discount?: number;
  wholesale_discount?: number;
  currency?: string;
};

export type OrderCheckoutInput = {
  mode: StripePaymentMode;
  orderType: OrderType;
  existingOrderId?: number | null;
  fulfillmentType: OrderFulfillmentType;
  customerAccount?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  storeId?: number | null;
  requestedPickUpStoreId?: number | null;
  pickupTime?: string;
  notes?: string;
  poNumber?: string;
  origin: string;
  returnTo?: string;
  successReturnTo?: string;
  buyer?: WholesaleOrderBuyer;
  shippingAddress?: WholesaleShippingAddress;
  billingAddress?: WholesaleBillingAddress;
  financialDetails?: WholesaleFinancialDetails;
  items: OrderCheckoutItem[];
};

export type OrderCheckoutResult = {
  url: string | null;
  draftOrderId: number | null;
  mode: StripePaymentMode;
};

type StoreStripeRow = {
  id: number;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string | null;
  platform_fee_percent: string | null;
};

type DraftOrderItemRow = {
  productId: number;
  qty: number;
  unitPrice: number;
  itemName: string;
  sku: string;
  uom: string;
  isCatchWeight: boolean;
};

type ProductOrderFields = {
  sku: string;
  uom: string;
  isCatchWeight: boolean;
};

type OrderPaymentTerms =
  | "prepaid"
  | "due_on_receipt"
  | "deposit_required"
  | "net_30"
  | "net_60"
  | "net_90";

type OrderAddressDbFields = {
  shipping_dba_name: string | null;
  shipping_special_instructions: string | null;
  shipping_preferred_window: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  billing_legal_name: string | null;
  billing_tax_id: string | null;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: string;
};

type DraftOrderRow = {
  id: number;
  order_type: OrderType;
  is_testing: boolean;
  invoice_number: string | null;
  requested_fulfillment_method: OrderFulfillmentType;
  customer_account: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  store_id: number | null;
  requested_pick_up_store_id: number | null;
  requested_target_date: string | null;
  payment_terms: OrderPaymentTerms;
  subtotal: number | string | null;
  coupon_code: string | null;
  coupon_discount: number | string | null;
  wholesale_discount: number | string | null;
  tax_total: number | string | null;
  shipping_fee: number | string | null;
  grand_total: number | string | null;
  notes: string | null;
  po_number: string | null;
} & OrderAddressDbFields;

type CreatePaidOrderWithItemsResponse = number;

const PAID_ORDER_RPC = "create_paid_order_with_items";

const ORDER_PAYMENT_TERMS = [
  "prepaid",
  "due_on_receipt",
  "deposit_required",
  "net_30",
  "net_60",
  "net_90",
] as const;

function parsePaymentTerms(value: unknown): OrderPaymentTerms {
  const raw = String(value ?? "prepaid").trim().toLowerCase().replace(/\s+/g, "_");
  if ((ORDER_PAYMENT_TERMS as readonly string[]).includes(raw)) {
    return raw as OrderPaymentTerms;
  }
  return "prepaid";
}

function parseRequestedTargetDate(pickupTime: string | null | undefined): string {
  const raw = pickupTime?.trim();
  if (!raw) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function computeCheckoutTotals(input: OrderCheckoutInput): {
  subtotal: number;
  coupon_code: string | null;
  coupon_discount: number;
  wholesale_discount: number;
  tax_total: number;
  shipping_fee: number;
  grand_total: number;
} {
  const itemsSubtotal = input.items.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );

  if (input.financialDetails) {
    return {
      subtotal: input.financialDetails.subtotal_ex_gst,
      coupon_code: input.financialDetails.coupon_code?.trim() || null,
      coupon_discount: input.financialDetails.coupon_discount ?? 0,
      wholesale_discount: 0,
      tax_total: input.financialDetails.gst_total,
      shipping_fee: input.financialDetails.shipping_fee ?? 0,
      grand_total: input.financialDetails.grand_total_inc_gst,
    };
  }

  return {
    subtotal: itemsSubtotal,
    coupon_code: null,
    coupon_discount: 0,
    wholesale_discount: 0,
    tax_total: 0,
    shipping_fee: 0,
    grand_total: itemsSubtotal,
  };
}

function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

export function formatOrderInvoiceNumber(
  orderId: number,
  createdAt: string | Date = new Date(),
): string {
  const year = new Date(createdAt).getFullYear();
  return `SE-INV-${year}-${String(orderId).padStart(4, "0")}`;
}

function formatStreetLine(street1: string, street2?: string | null): string {
  return [street1, street2].map((part) => part?.trim()).filter(Boolean).join(", ");
}

function defaultOrderAddressFields(): OrderAddressDbFields {
  return {
    shipping_dba_name: null,
    shipping_special_instructions: null,
    shipping_preferred_window: null,
    shipping_address: "In-store pickup",
    shipping_city: "N/A",
    shipping_state: "N/A",
    shipping_postal_code: "0000",
    shipping_country: "Australia",
    billing_legal_name: null,
    billing_tax_id: null,
    billing_address: "In-store pickup",
    billing_city: "N/A",
    billing_state: "N/A",
    billing_postal_code: "0000",
    billing_country: "Australia",
  };
}

function shippingAddressToDbFields(
  address: WholesaleShippingAddress,
): Pick<
  OrderAddressDbFields,
  | "shipping_dba_name"
  | "shipping_special_instructions"
  | "shipping_preferred_window"
  | "shipping_address"
  | "shipping_city"
  | "shipping_state"
  | "shipping_postal_code"
  | "shipping_country"
> {
  return {
    shipping_dba_name: address.dba_name.trim() || null,
    shipping_special_instructions: address.special_instructions?.trim() || null,
    shipping_preferred_window: address.preferred_window?.trim() || null,
    shipping_address: formatStreetLine(address.street_1, address.street_2),
    shipping_city: address.city.trim(),
    shipping_state: (address.state ?? "N/A").trim() || "N/A",
    shipping_postal_code: address.postal_code.trim(),
    shipping_country: (address.country ?? "Australia").trim() || "Australia",
  };
}

function billingAddressToDbFields(
  address: WholesaleBillingAddress,
): Pick<
  OrderAddressDbFields,
  | "billing_legal_name"
  | "billing_tax_id"
  | "billing_address"
  | "billing_city"
  | "billing_state"
  | "billing_postal_code"
  | "billing_country"
> {
  return {
    billing_legal_name: address.legal_name.trim() || null,
    billing_tax_id: address.tax_id?.trim() || null,
    billing_address: formatStreetLine(address.street_1, address.street_2),
    billing_city: address.city.trim(),
    billing_state: (address.state ?? "N/A").trim() || "N/A",
    billing_postal_code: address.postal_code.trim(),
    billing_country: (address.country ?? "Australia").trim() || "Australia",
  };
}

function resolveOrderAddressFields(input: OrderCheckoutInput): OrderAddressDbFields {
  if (input.orderType === "wholesale" && input.billingAddress) {
    const billing = billingAddressToDbFields(input.billingAddress);
    if (input.fulfillmentType === "pick_up") {
      return {
        ...defaultOrderAddressFields(),
        ...billing,
      };
    }
    if (input.shippingAddress) {
      return {
        ...shippingAddressToDbFields(input.shippingAddress),
        ...billing,
      };
    }
  }
  return defaultOrderAddressFields();
}

async function fetchProductsForOrderItems(
  supabase: ReturnType<typeof createServiceClient>,
  productIds: number[],
): Promise<Map<number, ProductOrderFields>> {
  const uniqueIds = [...new Set(productIds.filter((id) => id > 0))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, sku, uom, is_catch_weight")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(error.message);
  }

  const productsById = new Map<number, ProductOrderFields>();
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const id = Number(record.id);
    if (!Number.isFinite(id) || id <= 0) continue;

    const sku = String(record.sku ?? "").trim();
    if (!sku) {
      throw new Error(`Product #${id} is missing a SKU`);
    }

    const uom = String(record.uom ?? "EACH").trim() || "EACH";
    productsById.set(id, {
      sku,
      uom,
      isCatchWeight: Boolean(record.is_catch_weight),
    });
  }

  for (const id of uniqueIds) {
    if (!productsById.has(id)) {
      throw new Error(`Product #${id} not found`);
    }
  }

  return productsById;
}

function buildOrderItemInsertRows(
  orderId: number,
  orderType: OrderType,
  items: OrderCheckoutItem[],
  productsById: Map<number, ProductOrderFields>,
): Record<string, unknown>[] {
  return items.map((item) => {
    const lineTotal = item.qty * item.unitPrice;
    const productId = item.productId;
    const product = productsById.get(productId);
    if (!product) {
      throw new Error(`Product #${productId} not found`);
    }

    return {
      order_id: orderId,
      item_type: orderType,
      product_id: productId,
      sku: product.sku,
      name: item.itemName,
      quantity: item.qty,
      uom: product.uom,
      is_catch_weight: product.isCatchWeight,
      unit_price: formatMoney(item.unitPrice),
      line_total: formatMoney(lineTotal),
    };
  });
}

async function insertOrderItemsForDraft(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
  orderType: OrderType,
  items: OrderCheckoutItem[],
): Promise<void> {
  const productsById = await fetchProductsForOrderItems(
    supabase,
    items.map((item) => item.productId),
  );
  const rows = buildOrderItemInsertRows(orderId, orderType, items, productsById);
  const { error } = await supabase.from("order_items").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}

async function fetchDraftOrderItems(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
  orderType: OrderType,
): Promise<DraftOrderItemRow[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, quantity, unit_price, name, sku, uom, is_catch_weight")
    .eq("order_id", orderId);

  if (error) {
    throw new Error(error.message);
  }

  const parsed: DraftOrderItemRow[] = [];
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const productId = Number(record.product_id);
    const qty = Number(record.quantity);
    const unitPrice = Number(record.unit_price);
    const itemName = String(record.name ?? "").trim();
    const sku = String(record.sku ?? "").trim();
    const uom = String(record.uom ?? "EACH").trim() || "EACH";
    const isCatchWeight = Boolean(record.is_catch_weight);

    if (!Number.isFinite(productId) || productId <= 0) continue;
    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
    if (!itemName) continue;
    if (!sku) continue;

    parsed.push({
      productId,
      qty,
      unitPrice,
      itemName,
      sku,
      uom,
      isCatchWeight,
    });
  }

  return parsed;
}

function mapCheckoutItemsToPayload(items: DraftOrderItemRow[]) {
  return items.map((item) => {
    const lineTotal = item.qty * item.unitPrice;
    return {
      product_id: item.productId,
      sku: item.sku,
      name: item.itemName,
      quantity: item.qty,
      uom: item.uom,
      is_catch_weight: item.isCatchWeight,
      unit_price: item.unitPrice,
      line_total: lineTotal,
    };
  });
}

async function findOrderIdByStripeSession(
  supabase: ReturnType<typeof createServiceClient>,
  sessionId: string,
): Promise<number | null> {
  const { data, error } = await supabase.rpc("find_order_id_by_stripe_session", {
    p_gateway_transaction_id: sessionId,
  });

  if (error || data == null) return null;
  const orderId = Number(data);
  return Number.isFinite(orderId) && orderId > 0 ? orderId : null;
}

async function ensureWholesaleInventoryForOrder(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
): Promise<void> {
  const { error } = await supabase.rpc("ensure_wholesale_inventory_sales_for_order", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(
      `Failed to record wholesale inventory for order #${orderId}: ${error.message}`,
    );
  }
}

async function orderHasPaidPayment(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("order_payments")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return data != null;
}

async function fetchTrackingDetailsForPaidOrder(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
): Promise<{ trackingToken: string | null; invoiceNumber: string | null }> {
  if (!(await orderHasPaidPayment(supabase, orderId))) {
    return { trackingToken: null, invoiceNumber: null };
  }

  const { data, error } = await supabase
    .from("orders")
    .select("tracking_token, invoice_number")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    return { trackingToken: null, invoiceNumber: null };
  }

  return {
    trackingToken: (data.tracking_token as string | null) ?? null,
    invoiceNumber: (data.invoice_number as string | null) ?? null,
  };
}

async function fetchTrackingTokenForPaidOrder(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
): Promise<string | null> {
  const { trackingToken } = await fetchTrackingDetailsForPaidOrder(supabase, orderId);
  return trackingToken;
}

const ORDER_TOKEN_LENGTH = 12;
const CROCKFORD_BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomCrockfordBase32(length: number): string {
  const byteCount = Math.ceil((length * 5) / 8);
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);

  let buffer = 0;
  let bitsLeft = 0;
  let byteIndex = 0;
  let output = "";

  while (output.length < length) {
    if (bitsLeft < 5) {
      buffer = (buffer << 8) | bytes[byteIndex++];
      bitsLeft += 8;
    }
    bitsLeft -= 5;
    output += CROCKFORD_BASE32_ALPHABET[(buffer >> bitsLeft) & 0x1f];
  }

  return output;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseOptionalCustomerAccount(value: unknown): string | null {
  if (value == null) return null;
  const account = String(value).trim();
  if (!account) return null;
  if (!isValidUuid(account)) throw new Error("Invalid customer account");
  return account;
}

function parseOrderType(value: unknown): OrderType {
  const raw = String(value ?? "pickup").trim().toLowerCase();
  if (raw === "wholesale") return "wholesale";
  if (raw === "catering") return "catering";
  if (raw === "pickup") return "pickup";
  throw new Error("Invalid order type");
}

function parseFulfillmentType(value: unknown): OrderFulfillmentType | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "pick_up" || raw === "pickup") return "pick_up";
  if (raw === "delivery") return "delivery";
  if (raw === "shipping") return "shipping";
  return null;
}

function resolveFulfillmentType(
  orderType: OrderType,
  explicit: OrderFulfillmentType | null,
): OrderFulfillmentType {
  if (explicit) return explicit;
  if (orderType === "wholesale") return "delivery";
  if (orderType === "catering") return "delivery";
  return "pick_up";
}

function parseOptionalJsonObject<T extends Record<string, unknown>>(
  value: unknown,
  label: string,
): T | undefined {
  if (value == null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value as T;
}

function parseWholesaleBuyer(value: unknown): WholesaleOrderBuyer | undefined {
  const row = parseOptionalJsonObject<Record<string, unknown>>(value, "buyer");
  if (!row) return undefined;
  const name = String(row.name ?? "").trim();
  const contact_phone = String(row.contact_phone ?? "").trim();
  if (!name || !contact_phone) {
    throw new Error("Buyer name and contact phone are required");
  }
  return {
    name,
    role: row.role != null ? String(row.role).trim() || null : null,
    contact_phone,
    contact_email:
      row.contact_email != null ? String(row.contact_email).trim() || null : null,
  };
}

function parseWholesaleShippingAddress(
  value: unknown,
): WholesaleShippingAddress | undefined {
  const row = parseOptionalJsonObject<Record<string, unknown>>(
    value,
    "shipping address",
  );
  if (!row) return undefined;
  const street_1 = String(row.street_1 ?? "").trim();
  const city = String(row.city ?? "").trim();
  const postal_code = String(row.postal_code ?? "").trim();
  const dba_name = String(row.dba_name ?? "").trim();
  if (!street_1 || !city || !postal_code || !dba_name) {
    throw new Error("Shipping address requires DBA name, street, city, and postal code");
  }
  return {
    dba_name,
    street_1,
    street_2: row.street_2 != null ? String(row.street_2).trim() || null : null,
    city,
    state: row.state != null ? String(row.state).trim() || null : null,
    postal_code,
    country: row.country != null ? String(row.country).trim() || null : null,
    special_instructions:
      row.special_instructions != null
        ? String(row.special_instructions).trim() || null
        : null,
    preferred_window:
      row.preferred_window != null
        ? String(row.preferred_window).trim() || null
        : null,
  };
}

function parseWholesaleBillingAddress(
  value: unknown,
): WholesaleBillingAddress | undefined {
  const row = parseOptionalJsonObject<Record<string, unknown>>(
    value,
    "billing address",
  );
  if (!row) return undefined;
  const legal_name = String(row.legal_name ?? "").trim();
  const street_1 = String(row.street_1 ?? "").trim();
  const city = String(row.city ?? "").trim();
  const postal_code = String(row.postal_code ?? "").trim();
  if (!legal_name || !street_1 || !city || !postal_code) {
    throw new Error(
      "Billing address requires legal name, street, city, and postal code",
    );
  }
  return {
    legal_name,
    street_1,
    street_2: row.street_2 != null ? String(row.street_2).trim() || null : null,
    city,
    state: row.state != null ? String(row.state).trim() || null : null,
    postal_code,
    country: row.country != null ? String(row.country).trim() || null : null,
    tax_id: row.tax_id != null ? String(row.tax_id).trim() || null : null,
    payment_terms:
      row.payment_terms != null ? String(row.payment_terms).trim() || null : null,
  };
}

function parseWholesaleFinancialDetails(
  value: unknown,
): WholesaleFinancialDetails | undefined {
  const row = parseOptionalJsonObject<Record<string, unknown>>(
    value,
    "financial details",
  );
  if (!row) return undefined;
  const subtotal_ex_gst = Number(row.subtotal_ex_gst);
  const gst_total = Number(row.gst_total);
  const grand_total_inc_gst = Number(row.grand_total_inc_gst);
  if (
    !Number.isFinite(subtotal_ex_gst) ||
    !Number.isFinite(gst_total) ||
    !Number.isFinite(grand_total_inc_gst)
  ) {
    throw new Error("Invalid financial details");
  }
  return {
    subtotal_ex_gst,
    gst_total,
    grand_total_inc_gst,
    shipping_fee: Number.isFinite(Number(row.shipping_fee))
      ? Number(row.shipping_fee)
      : undefined,
    coupon_code: row.coupon_code != null ? String(row.coupon_code).trim() || undefined : undefined,
    coupon_discount: Number.isFinite(Number(row.coupon_discount))
      ? Number(row.coupon_discount)
      : undefined,
    wholesale_discount: Number.isFinite(Number(row.wholesale_discount))
      ? Number(row.wholesale_discount)
      : undefined,
    currency: row.currency != null ? String(row.currency).trim() || undefined : undefined,
  };
}

function parseOptionalStoreId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const storeId = Number(value);
  if (!Number.isFinite(storeId) || storeId <= 0) {
    throw new Error("Invalid store");
  }
  return storeId;
}

function parseOptionalOrderId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const orderId = Number(value);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error("Invalid order");
  }
  return orderId;
}

function resolveRequestedPickUpStoreId(input: OrderCheckoutInput): number | null {
  if (input.requestedPickUpStoreId != null) {
    return input.requestedPickUpStoreId;
  }
  if (input.fulfillmentType === "pick_up" && input.storeId != null) {
    return input.storeId;
  }
  return null;
}

function resolveStripeConnectStoreId(input: OrderCheckoutInput): number | null {
  if (input.storeId != null) return input.storeId;
  return resolveRequestedPickUpStoreId(input);
}

function normalizeReturnPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function wholesaleOrdersPathFromReturnTo(returnTo?: string): string {
  if (returnTo) {
    const path = normalizeReturnPath(returnTo);
    if (path.endsWith("/shop")) {
      return `${path.slice(0, -5)}/orders`;
    }
  }
  return "/wholesale/orders";
}

function cateringOrdersPathFromReturnTo(returnTo?: string): string {
  if (returnTo) {
    const path = normalizeReturnPath(returnTo);
    if (path.endsWith("/catering-shop")) {
      return path.replace(/\/catering-shop$/, "/catering-orders");
    }
  }
  return "/member/catering-orders";
}

function checkoutReturnUrls(
  origin: string,
  orderType: OrderType,
  returnTo?: string,
  successReturnTo?: string,
) {
  if (orderType === "wholesale") {
    const cancelPath = returnTo
      ? normalizeReturnPath(returnTo)
      : "/wholesale/shop";
    const successPath = successReturnTo
      ? normalizeReturnPath(successReturnTo)
      : wholesaleOrdersPathFromReturnTo(returnTo);
    return {
      successUrl: `${origin}${successPath}?checkout=success&sessionId={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}${cancelPath}?checkout=cancelled`,
    };
  }

  if (orderType === "catering") {
    const cancelPath = returnTo
      ? normalizeReturnPath(returnTo)
      : "/member/catering-shop";
    const successPath = successReturnTo
      ? normalizeReturnPath(successReturnTo)
      : cateringOrdersPathFromReturnTo(returnTo);
    return {
      successUrl: `${origin}${successPath}?checkout=success&sessionId={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}${cancelPath}?checkout=cancelled`,
    };
  }

  if (returnTo) {
    const path = normalizeReturnPath(returnTo);
    return {
      successUrl: `${origin}${path}?checkout=success&sessionId={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}${path}?checkout=cancelled`,
    };
  }

  return {
    successUrl: `${origin}/checkout/success?sessionId={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/checkout?cancelled=1`,
  };
}

function resolveCustomerAccount(
  draftOrder: Pick<DraftOrderRow, "customer_account">,
  session: Stripe.Checkout.Session,
): string | null {
  for (const value of [draftOrder.customer_account, session.metadata?.customerAccount]) {
    if (typeof value === "string" && isValidUuid(value)) return value;
  }
  return null;
}

function buildOrderPayload(
  draftOrder: DraftOrderRow,
  paymentMode: StripePaymentMode,
  cancelToken: string,
  trackingToken: string,
  customerAccount: string | null,
): Record<string, unknown> {
  const subtotal = Number(draftOrder.subtotal ?? 0);
  const couponCode = draftOrder.coupon_code?.trim() || null;
  const couponDiscount = Number(draftOrder.coupon_discount ?? 0);
  const wholesaleDiscount = Number(draftOrder.wholesale_discount ?? 0);
  const taxTotal = Number(draftOrder.tax_total ?? 0);
  const shippingFee = Number(draftOrder.shipping_fee ?? 0);
  const grandTotal = Number(draftOrder.grand_total ?? 0);
  const requestedTargetDate =
    draftOrder.requested_target_date ?? new Date().toISOString();

  return {
    order_type: draftOrder.order_type,
    is_testing: draftOrder.is_testing || paymentMode === "test",
    invoice_number:
      draftOrder.invoice_number ??
      formatOrderInvoiceNumber(draftOrder.id, requestedTargetDate),
    requested_fulfillment_method: draftOrder.requested_fulfillment_method,
    requested_target_date: requestedTargetDate,
    customer_account: customerAccount,
    customer_name: draftOrder.customer_name ?? "",
    customer_email: draftOrder.customer_email ?? "",
    customer_phone: draftOrder.customer_phone ?? "",
    store_id: draftOrder.store_id,
    requested_pick_up_store_id: draftOrder.requested_pick_up_store_id,
    payment_terms: draftOrder.payment_terms,
    po_number: draftOrder.po_number,
    subtotal: formatMoney(subtotal),
    coupon_code: couponCode,
    coupon_discount: formatMoney(couponDiscount),
    wholesale_discount: formatMoney(wholesaleDiscount),
    tax_total: formatMoney(taxTotal),
    shipping_fee: formatMoney(shippingFee),
    grand_total: formatMoney(grandTotal),
    notes: draftOrder.notes ?? null,
    cancel_token: cancelToken,
    tracking_token: trackingToken,
    status_updated_at: new Date().toISOString(),
    shipping_dba_name: draftOrder.shipping_dba_name,
    shipping_special_instructions: draftOrder.shipping_special_instructions,
    shipping_preferred_window: draftOrder.shipping_preferred_window,
    shipping_address: draftOrder.shipping_address,
    shipping_city: draftOrder.shipping_city,
    shipping_state: draftOrder.shipping_state,
    shipping_postal_code: draftOrder.shipping_postal_code,
    shipping_country: draftOrder.shipping_country,
    billing_legal_name: draftOrder.billing_legal_name,
    billing_tax_id: draftOrder.billing_tax_id,
    billing_address: draftOrder.billing_address,
    billing_city: draftOrder.billing_city,
    billing_state: draftOrder.billing_state,
    billing_postal_code: draftOrder.billing_postal_code,
    billing_country: draftOrder.billing_country,
  };
}

function stripeResourceId(
  value: string | Stripe.Customer | Stripe.PaymentIntent | null | undefined,
): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
}

function omitEmptyGatewayFields(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry == null) continue;
    if (typeof entry === "object" && !Array.isArray(entry)) {
      const nested = omitEmptyGatewayFields(entry as Record<string, unknown>);
      if (Object.keys(nested).length > 0) {
        result[key] = nested;
      }
      continue;
    }
    if (Array.isArray(entry) && entry.length === 0) continue;
    result[key] = entry;
  }
  return result;
}

function buildStripeCheckoutGatewayData(
  session: Stripe.Checkout.Session,
): Record<string, unknown> {
  const customerDetails = session.customer_details;
  const totalDetails = session.total_details;

  return omitEmptyGatewayFields({
    stripe_checkout_session_id: session.id,
    stripe_object: session.object,
    stripe_livemode: session.livemode,
    stripe_mode: session.mode,
    stripe_status: session.status,
    stripe_payment_status: session.payment_status,
    stripe_currency: session.currency,
    stripe_amount_total: session.amount_total,
    stripe_amount_subtotal: session.amount_subtotal,
    stripe_created: session.created,
    stripe_expires_at: session.expires_at,
    stripe_payment_intent_id: stripeResourceId(session.payment_intent),
    stripe_customer_id: stripeResourceId(session.customer),
    stripe_customer_email: session.customer_email,
    stripe_client_reference_id: session.client_reference_id,
    stripe_payment_method_types: session.payment_method_types,
    stripe_metadata: session.metadata,
    stripe_success_url: session.success_url,
    stripe_cancel_url: session.cancel_url,
    stripe_customer_details: customerDetails
      ? {
          email: customerDetails.email,
          name: customerDetails.name,
          phone: customerDetails.phone,
          tax_exempt: customerDetails.tax_exempt,
          tax_ids: customerDetails.tax_ids?.map((taxId) => ({
            type: taxId.type,
            value: taxId.value,
          })),
          address: customerDetails.address
            ? {
                city: customerDetails.address.city,
                country: customerDetails.address.country,
                line1: customerDetails.address.line1,
                line2: customerDetails.address.line2,
                postal_code: customerDetails.address.postal_code,
                state: customerDetails.address.state,
              }
            : undefined,
        }
      : undefined,
    stripe_total_details: totalDetails
      ? {
          amount_tax: totalDetails.amount_tax,
          amount_discount: totalDetails.amount_discount,
          amount_shipping: totalDetails.amount_shipping,
        }
      : undefined,
  });
}

function stripeCouponFromSession(session: Stripe.Checkout.Session): {
  coupon_code: string | null;
  coupon_discount: number;
  grand_total: number | null;
} {
  const discountCents = session.total_details?.amount_discount ?? 0;
  const coupon_discount = discountCents > 0 ? discountCents / 100 : 0;
  const coupon_code = session.metadata?.couponCode?.trim() || null;
  const grand_total =
    session.amount_total != null && session.amount_total > 0
      ? session.amount_total / 100
      : null;

  return { coupon_code, coupon_discount, grand_total };
}

function enrichOrderPayloadFromStripeSession(
  orderPayload: Record<string, unknown>,
  session: Stripe.Checkout.Session,
): Record<string, unknown> {
  const stripeCoupon = stripeCouponFromSession(session);
  const enriched = { ...orderPayload };

  if (stripeCoupon.coupon_discount > 0) {
    enriched.coupon_discount = formatMoney(stripeCoupon.coupon_discount);
    if (stripeCoupon.coupon_code) {
      enriched.coupon_code = stripeCoupon.coupon_code;
    }
  }

  if (stripeCoupon.grand_total != null && stripeCoupon.grand_total > 0) {
    enriched.grand_total = formatMoney(stripeCoupon.grand_total);
  }

  return enriched;
}

function buildPaymentPayload(
  grandTotal: number,
  paymentMode: StripePaymentMode,
  session: Stripe.Checkout.Session,
): Record<string, unknown> {
  return {
    amount: formatMoney(grandTotal),
    status: "paid",
    mode: paymentMode,
    method: "credit_card",
    gateway: "stripe",
    gateway_transaction_id: session.id,
    gateway_data: buildStripeCheckoutGatewayData(session),
  };
}

export function validateOrderCheckoutInput(body: unknown): OrderCheckoutInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;
  const mode = parsePaymentMode(data.mode);
  const orderType = parseOrderType(data.orderType);
  const fulfillmentType = resolveFulfillmentType(
    orderType,
    parseFulfillmentType(data.fulfillmentType),
  );
  const customerName = String(data.customerName ?? "").trim();
  const customerEmail = String(data.customerEmail ?? "").trim();
  const customerPhone = String(data.customerPhone ?? "").trim();
  const storeId = parseOptionalStoreId(data.storeId);
  const requestedPickUpStoreId = parseOptionalStoreId(data.requestedPickUpStoreId);
  const existingOrderId = parseOptionalOrderId(data.orderId);
  const pickupTimeRaw = data.pickupTime != null ? String(data.pickupTime).trim() : "";
  const origin = String(data.origin ?? "").trim();
  const notes = data.notes != null ? String(data.notes).trim() : undefined;
  const poNumber = data.poNumber != null ? String(data.poNumber).trim() : undefined;
  const customerAccount = parseOptionalCustomerAccount(data.customerAccount);
  const returnTo = data.returnTo != null ? String(data.returnTo).trim() : undefined;
  const successReturnTo =
    data.successReturnTo != null ? String(data.successReturnTo).trim() : undefined;

  if (!customerName) throw new Error("Please enter your name");
  if (!customerEmail || !isValidEmail(customerEmail)) {
    throw new Error("Please enter a valid email");
  }
  if (!customerPhone) throw new Error("Please enter your phone number");
  if (orderType === "pickup") {
    if (storeId == null) throw new Error("Please select a pickup store");
    if (!pickupTimeRaw) throw new Error("Please select a pickup time");
  }
  if (
    orderType === "wholesale" &&
    fulfillmentType === "pick_up" &&
    (requestedPickUpStoreId == null || requestedPickUpStoreId <= 0)
  ) {
    throw new Error("Please select a pickup store before checkout");
  }
  if (!origin) throw new Error("Missing site origin");

  const pickupTime =
    pickupTimeRaw || (orderType === "wholesale" ? "To be arranged" : "");

  if (orderType === "wholesale" && !customerAccount) {
    throw new Error("Please sign in to place a wholesale order");
  }
  if (orderType === "catering" && !customerAccount) {
    throw new Error("Please sign in to place a catering order");
  }
  // Paying an existing catering order doesn't require re-supplying event date.
  if (orderType === "catering" && existingOrderId == null && !pickupTimeRaw) {
    throw new Error("Please select an event date");
  }

  const buyer = parseWholesaleBuyer(data.buyer);
  const shippingAddress = parseWholesaleShippingAddress(data.shippingAddress);
  const billingAddress = parseWholesaleBillingAddress(data.billingAddress);
  const financialDetails = parseWholesaleFinancialDetails(data.financialDetails);

  if (orderType === "wholesale") {
    if (!buyer || !billingAddress || !financialDetails) {
      throw new Error("Wholesale checkout requires buyer, billing, and totals");
    }
    if (fulfillmentType !== "pick_up" && !shippingAddress) {
      throw new Error("Wholesale checkout requires shipping address for delivery or shipping");
    }
  }

  const rawItems = data.items;
  const items: OrderCheckoutItem[] =
    Array.isArray(rawItems) && rawItems.length > 0
      ? rawItems.map((raw) => {
        const row = raw as Record<string, unknown>;
        const menuItemId = Number(row.menuItemId ?? row.productId);
        const qty = Number(row.qty);
        const unitPrice = Number(row.unitPrice);
        const itemName = String(row.itemName ?? "").trim();

        if (!Number.isFinite(menuItemId) || menuItemId <= 0) throw new Error("Invalid product");
        if (!Number.isFinite(qty) || qty < 1) throw new Error("Invalid quantity");
        if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Invalid price");
        if (!itemName) throw new Error("Invalid item name");

        return { productId: menuItemId, qty, unitPrice, itemName };
      })
      : [];

  if (!existingOrderId && items.length === 0) {
    throw new Error("Your cart is empty");
  }

  return {
    mode,
    orderType,
    existingOrderId,
    fulfillmentType,
    customerAccount,
    customerName,
    customerEmail,
    customerPhone,
    storeId,
    requestedPickUpStoreId,
    pickupTime,
    notes: notes || undefined,
    poNumber: poNumber || undefined,
    origin,
    returnTo: returnTo || undefined,
    successReturnTo: successReturnTo || undefined,
    buyer,
    shippingAddress,
    billingAddress,
    financialDetails,
    items,
  };
}

type WholesaleAvailabilityRow = {
  product_id: number;
  effective_remaining: number;
  global_remaining: number;
  customer_remaining: number | null;
  daily_customer_limit: number | null;
};

type ExistingCateringOrderRow = {
  id: number;
  customer_account: string | null;
  customer_name: string;
  customer_email: string;
  status: string;
  order_type: string;
  is_testing: boolean;
  subtotal: number | string;
  coupon_discount: number | string;
  wholesale_discount: number | string;
  tax_total: number | string;
  shipping_fee: number | string;
  grand_total: number | string;
};

async function fetchExistingCateringAwaitingPaymentOrder(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
  customerAccount: string | null | undefined,
): Promise<ExistingCateringOrderRow> {
  if (!customerAccount) {
    throw new Error("Please sign in to pay for this catering order");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, customer_account, customer_name, customer_email, status, order_type, is_testing, subtotal, coupon_discount, wholesale_discount, tax_total, shipping_fee, grand_total",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Order not found");
  }

  const order = data as ExistingCateringOrderRow;
  if (order.order_type !== "catering") {
    throw new Error("Only catering orders can be paid from this page");
  }
  if (order.customer_account !== customerAccount) {
    throw new Error("You can only pay your own order");
  }
  if (order.status !== "awaiting_payment") {
    throw new Error("This order is not ready for payment");
  }
  if (Number(order.grand_total ?? 0) <= 0) {
    throw new Error("Order total must be greater than zero");
  }

  return order;
}

function resolveExistingCateringCheckoutTotals(
  order: ExistingCateringOrderRow,
  financialDetails?: WholesaleFinancialDetails,
): {
  subtotal: number;
  couponDiscount: number;
  wholesaleDiscount: number;
  taxTotal: number;
  shippingFee: number;
  grandTotal: number;
} {
  const subtotal = Number(financialDetails?.subtotal_ex_gst ?? order.subtotal ?? 0);
  const couponDiscount = Number(financialDetails?.coupon_discount ?? order.coupon_discount ?? 0);
  const wholesaleDiscount = Number(
    financialDetails?.wholesale_discount ?? order.wholesale_discount ?? 0,
  );
  const taxTotal = Number(financialDetails?.gst_total ?? order.tax_total ?? 0);
  const shippingFee = Number(financialDetails?.shipping_fee ?? order.shipping_fee ?? 0);
  const grandFromFormula =
    subtotal - (couponDiscount + wholesaleDiscount) + taxTotal + shippingFee;
  const grandTotal = Number(
    (
      financialDetails?.grand_total_inc_gst ??
      (Number.isFinite(grandFromFormula) && grandFromFormula > 0
        ? grandFromFormula
        : Number(order.grand_total ?? 0))
    ).toFixed(2),
  );

  if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
    throw new Error("Order total must be greater than zero");
  }

  return {
    subtotal: Number(subtotal.toFixed(2)),
    couponDiscount: Number(couponDiscount.toFixed(2)),
    wholesaleDiscount: Number(wholesaleDiscount.toFixed(2)),
    taxTotal: Number(taxTotal.toFixed(2)),
    shippingFee: Number(shippingFee.toFixed(2)),
    grandTotal,
  };
}

function wholesaleInventoryLimitMessage(
  itemName: string,
  requestedQty: number,
  row: WholesaleAvailabilityRow,
): string {
  const remaining = Math.max(row.effective_remaining, 0);
  const overGlobal = requestedQty > row.global_remaining;
  const hasCustomerCap = row.daily_customer_limit != null;
  const customerRemaining = row.customer_remaining;
  const overCustomer =
    hasCustomerCap &&
    customerRemaining != null &&
    requestedQty > customerRemaining;

  if (remaining <= 0) {
    if (overCustomer && overGlobal) {
      return `${itemName} has reached both today's store-wide limit and your personal daily limit. Try again tomorrow or choose another product.`;
    }
    if (overCustomer) {
      return `You have reached your daily limit of ${row.daily_customer_limit} units for ${itemName}. Try again tomorrow.`;
    }
    return `${itemName} has reached today's store-wide limit. Try again tomorrow or choose another product.`;
  }

  if (overCustomer && (!overGlobal || customerRemaining === remaining)) {
    return `You can only order ${remaining} more units of ${itemName} today (your daily limit is ${row.daily_customer_limit}).`;
  }

  if (overGlobal) {
    return `Only ${remaining} units of ${itemName} are left today across all customers. Please reduce the quantity in your cart.`;
  }

  return `Only ${remaining} units of ${itemName} are available today. Please reduce the quantity in your cart.`;
}

async function fetchWholesaleTiers(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<WholesaleTierRow[]> {
  const { data, error } = await supabase
    .from("wholesale_tiers")
    .select("label, min_value, discount_value")
    .gt("min_value", 0)
    .gt("discount_value", 0)
    .order("min_value", { ascending: false });

  if (error) {
    throw new Error(`Failed to load wholesale tiers: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      label: String(record.label ?? ""),
      min_value: Number(record.min_value),
      discount_value: Number(record.discount_value),
    };
  });
}

async function validateWholesaleInventoryAvailability(
  supabase: ReturnType<typeof createServiceClient>,
  customerAccount: string,
  items: OrderCheckoutItem[],
): Promise<void> {
  const qtyByProduct = new Map<number, { qty: number; itemName: string }>();

  for (const item of items) {
    const existing = qtyByProduct.get(item.productId);
    qtyByProduct.set(item.productId, {
      qty: (existing?.qty ?? 0) + item.qty,
      itemName: item.itemName,
    });
  }

  for (const [productId, { qty, itemName }] of qtyByProduct) {
    const { data, error } = await supabase.rpc("get_wholesale_product_availability", {
      p_product_id: productId,
      p_customer_account: customerAccount,
    });

    if (error) {
      throw new Error(error.message);
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | WholesaleAvailabilityRow
      | undefined;

    if (!row) {
      throw new Error(`${itemName} is not available for wholesale today.`);
    }

    if (qty > row.effective_remaining) {
      throw new Error(wholesaleInventoryLimitMessage(itemName, qty, row));
    }
  }
}

export async function createOrderCheckoutSession(
  input: OrderCheckoutInput,
): Promise<OrderCheckoutResult> {
  const supabase = createServiceClient();

  if (input.existingOrderId != null) {
    if (input.orderType !== "catering") {
      throw new Error("Existing-order checkout is only supported for catering");
    }

    const existingOrder = await fetchExistingCateringAwaitingPaymentOrder(
      supabase,
      input.existingOrderId,
      input.customerAccount,
    );
    const totals = resolveExistingCateringCheckoutTotals(
      existingOrder,
      input.financialDetails,
    );

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: `Catering order ${formatOrderInvoiceNumber(existingOrder.id)}`,
          },
          unit_amount: Math.round(totals.grandTotal * 100),
        },
        quantity: 1,
      },
    ];

    const stripe = createStripeClient(input.mode);
    const { successUrl, cancelUrl } = checkoutReturnUrls(
      input.origin,
      input.orderType,
      input.returnTo,
      input.successReturnTo,
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: existingOrder.customer_email || input.customerEmail,
      client_reference_id: String(existingOrder.id),
      metadata: {
        mode: input.mode,
        orderType: "catering",
        existingOrderId: String(existingOrder.id),
        customerAccount: input.customerAccount ?? "",
        subtotalExGst: formatMoney(totals.subtotal),
        couponDiscount: formatMoney(totals.couponDiscount),
        wholesaleDiscount: formatMoney(totals.wholesaleDiscount),
        taxTotal: formatMoney(totals.taxTotal),
        shippingFee: formatMoney(totals.shippingFee),
        grandTotal: formatMoney(totals.grandTotal),
      },
      allow_promotion_codes: false,
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        metadata: {
          mode: input.mode,
          existingOrderId: String(existingOrder.id),
        },
      },
    });

    return { url: session.url, draftOrderId: null, mode: input.mode };
  }

  let totals = computeCheckoutTotals(input);
  let wholesaleStripeUnitAmountCents: number[] | null = null;

  if (input.orderType === "wholesale") {
    const tiers = await fetchWholesaleTiers(supabase);
    const pricingLines = input.items.map((item) => ({
      qty: item.qty,
      unitPriceExGst: item.unitPrice,
    }));
    const shippingFee = await resolveWholesaleShippingFee(supabase, input);

    const clientShippingFee = input.financialDetails?.shipping_fee;
    if (
      input.fulfillmentType !== "pick_up" &&
      clientShippingFee != null &&
      Math.abs(clientShippingFee - shippingFee) > 0.01
    ) {
      throw new Error(
        "The shipping quote has changed. Please recalculate shipping and try again.",
      );
    }

    const wholesaleTotals = computeWholesaleTierDiscountTotals(
      pricingLines,
      tiers,
      shippingFee,
    );

    totals = {
      subtotal: wholesaleTotals.subtotal,
      coupon_code: null,
      coupon_discount: 0,
      wholesale_discount: wholesaleTotals.wholesale_discount,
      tax_total: wholesaleTotals.tax_total,
      shipping_fee: wholesaleTotals.shipping_fee,
      grand_total: wholesaleTotals.grand_total,
    };
    wholesaleStripeUnitAmountCents = wholesaleTotals.stripe_unit_amount_cents;
  }

  if (totals.grand_total <= 0) {
    throw new Error("Order total must be greater than zero");
  }

  if (input.orderType === "wholesale" && input.customerAccount) {
    await validateWholesaleInventoryAvailability(
      supabase,
      input.customerAccount,
      input.items,
    );
  }

  const paymentTerms = parsePaymentTerms(
    input.billingAddress?.payment_terms ?? "prepaid",
  );
  const requestedTargetDate = parseRequestedTargetDate(input.pickupTime);
  const addressFields = resolveOrderAddressFields(input);
  const requestedPickUpStoreId = resolveRequestedPickUpStoreId(input);
  const stripeConnectStoreId = resolveStripeConnectStoreId(input);

  const { data: draftOrder, error: draftOrderError } = await supabase
    .from("draft_orders")
    .insert({
      order_type: input.orderType,
      is_testing: input.mode === "test",
      status: "awaiting_payment",
      requested_fulfillment_method: input.fulfillmentType,
      customer_account: input.customerAccount ?? null,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      store_id: stripeConnectStoreId,
      requested_pick_up_store_id: requestedPickUpStoreId,
      requested_target_date: requestedTargetDate,
      payment_terms: paymentTerms,
      subtotal: formatMoney(totals.subtotal),
      coupon_code: totals.coupon_code,
      coupon_discount: formatMoney(totals.coupon_discount),
      wholesale_discount: formatMoney(totals.wholesale_discount),
      tax_total: formatMoney(totals.tax_total),
      shipping_fee: formatMoney(totals.shipping_fee),
      grand_total: formatMoney(totals.grand_total),
      notes: input.notes ?? null,
      po_number: input.poNumber ?? null,
      ...addressFields,
    })
    .select("id")
    .single();

  if (draftOrderError || !draftOrder) {
    throw new Error(draftOrderError?.message ?? "Failed to create draft order");
  }
  const draftOrderId = draftOrder.id as number;
  const invoiceNumber = formatOrderInvoiceNumber(draftOrderId);

  const { error: invoiceNumberError } = await supabase
    .from("draft_orders")
    .update({ invoice_number: invoiceNumber })
    .eq("id", draftOrderId);

  if (invoiceNumberError) {
    await supabase.from("draft_orders").delete().eq("id", draftOrderId);
    throw new Error(invoiceNumberError.message);
  }

  try {
    await insertOrderItemsForDraft(
      supabase,
      draftOrderId,
      input.orderType,
      input.items,
    );
  } catch (err) {
    await supabase.from("draft_orders").delete().eq("id", draftOrderId);
    throw err;
  }

  let connectAccountId: string | null = null;
  let connectStatus: string | null = null;
  let platformFeePercent = 5;

  if (stripeConnectStoreId != null) {
    const { data: store, error: storeError } = await supabase
      .from("store_locations")
      .select("id, stripe_connect_account_id, stripe_connect_status, platform_fee_percent")
      .eq("id", stripeConnectStoreId)
      .maybeSingle();

    if (storeError) {
      throw new Error(storeError.message);
    }

    const storeRow = store as StoreStripeRow | null;
    connectAccountId = storeRow?.stripe_connect_account_id ?? null;
    connectStatus = storeRow?.stripe_connect_status ?? null;
    platformFeePercent = parseFloat(storeRow?.platform_fee_percent ?? "5.00");
  }
  const totalCents = Math.round(totals.grand_total * 100);
  const platformFeeCents =
    connectAccountId && connectStatus === "active"
      ? Math.round(totalCents * platformFeePercent / 100)
      : 0;

  const stripe = createStripeClient(input.mode);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    input.orderType === "wholesale" && wholesaleStripeUnitAmountCents
      ? input.items.map((item, index) => ({
        price_data: {
          currency: "aud",
          product_data: { name: item.itemName },
          unit_amount: wholesaleStripeUnitAmountCents[index],
        },
        quantity: item.qty,
      }))
      : input.items.map((item) => ({
        price_data: {
          currency: "aud",
          product_data: { name: item.itemName },
          unit_amount: Math.round(item.unitPrice * 100),
        },
        quantity: item.qty,
      }));

  if (input.orderType === "wholesale" && totals.shipping_fee > 0) {
    lineItems.push({
      price_data: {
        currency: "aud",
        product_data: { name: "Delivery" },
        unit_amount: Math.round(totals.shipping_fee * 100),
      },
      quantity: 1,
    });
  }

  const stripeMetadata: Record<string, string> = {
    draftOrderId: String(draftOrderId),
    mode: input.mode,
    orderType: input.orderType,
    fulfillmentType: input.fulfillmentType,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    pickupTime: input.pickupTime ?? "",
    storeId: stripeConnectStoreId != null ? String(stripeConnectStoreId) : "",
    requestedPickUpStoreId:
      requestedPickUpStoreId != null ? String(requestedPickUpStoreId) : "",
  };
  if (input.customerAccount) {
    stripeMetadata.customerAccount = input.customerAccount;
  }

  const { successUrl, cancelUrl } = checkoutReturnUrls(
    input.origin,
    input.orderType,
    input.returnTo,
    input.successReturnTo,
  );

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    customer_email: input.customerEmail,
    client_reference_id: String(draftOrderId),
    metadata: stripeMetadata,
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_intent_data: {
      metadata: { draftOrderId: String(draftOrderId), mode: input.mode },
      ...(connectAccountId && connectStatus === "active"
        ? {
            application_fee_amount: platformFeeCents,
            transfer_data: { destination: connectAccountId },
          }
        : {}),
    },
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  return { url: session.url, draftOrderId, mode: input.mode };
}

export async function markOrderPaidFromStripeSession(
  session: Stripe.Checkout.Session,
  paymentMode: StripePaymentMode,
): Promise<void> {
  const supabase = createServiceClient();
  const existingOrderId = getExistingOrderIdFromSession(session);
  if (existingOrderId) {
    const paymentAmount =
      session.amount_total != null && session.amount_total > 0
        ? session.amount_total / 100
        : 0;
    if (paymentAmount <= 0) {
      throw new Error(`Invalid paid amount for order #${existingOrderId}`);
    }

    const { error: paymentError } = await supabase.from("order_payments").insert({
      order_id: existingOrderId,
      amount: formatMoney(paymentAmount),
      status: "paid",
      mode: paymentMode,
      method: "credit_card",
      gateway: "stripe",
      gateway_transaction_id: session.id,
      gateway_data: buildStripeCheckoutGatewayData(session),
    });

    if (paymentError && !paymentError.message.toLowerCase().includes("duplicate")) {
      throw new Error(paymentError.message);
    }

    const { error: orderError } = await supabase
      .from("orders")
      .update({
        status: "confirmed",
        status_updated_at: new Date().toISOString(),
      })
      .eq("id", existingOrderId)
      .eq("order_type", "catering");

    if (orderError) {
      throw new Error(orderError.message);
    }

    console.log(
      `[stripe-webhook] Existing catering order #${existingOrderId} marked paid (${paymentMode})`,
    );
    return;
  }

  const draftOrderId = getDraftOrderIdFromSession(session);
  const existingPaidOrderId = await findExistingOrderIdBySession(
    session.id,
    paymentMode,
    supabase,
  );
  if (existingPaidOrderId) {
    await ensureWholesaleInventoryForOrder(supabase, existingPaidOrderId);
    if (draftOrderId) {
      await supabase.from("draft_orders").delete().eq("id", draftOrderId);
    }
    console.log(
      `[stripe-webhook] Session ${session.id} already mapped to ${paymentMode} order #${existingPaidOrderId}`,
    );
    return;
  }
  if (!draftOrderId) return;
  const draftOrder = await fetchDraftOrder(draftOrderId, supabase);
  if (!draftOrder) {
    console.error(`[stripe-webhook] Draft order #${draftOrderId} not found`);
    return;
  }

  const grandTotal = Number(draftOrder.grand_total ?? 0);
  if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
    throw new Error(`Invalid draft order total for #${draftOrderId}`);
  }
  const parsedItems = await fetchDraftOrderItems(
    supabase,
    draftOrderId,
    draftOrder.order_type,
  );
  if (parsedItems.length === 0) {
    throw new Error(`Draft order #${draftOrderId} has no valid items`);
  }

  const cancelToken = randomCrockfordBase32(ORDER_TOKEN_LENGTH);
  const trackingToken = randomCrockfordBase32(ORDER_TOKEN_LENGTH);
  const customerAccount = resolveCustomerAccount(draftOrder, session);
  const orderPayload = enrichOrderPayloadFromStripeSession(
    buildOrderPayload(
      draftOrder,
      paymentMode,
      cancelToken,
      trackingToken,
      customerAccount,
    ),
    session,
  );
  const paidGrandTotal = Number(orderPayload.grand_total ?? draftOrder.grand_total ?? 0);
  const { data: createdOrderId, error: createOrderError } = await supabase.rpc(
    PAID_ORDER_RPC,
    {
      p_draft_order_id: draftOrderId,
      p_items: mapCheckoutItemsToPayload(parsedItems),
      p_order_payload: orderPayload,
      p_payment_payload: buildPaymentPayload(paidGrandTotal, paymentMode, session),
    },
  );

  if (createOrderError || !createdOrderId) {
    console.error(
      `[stripe-webhook] Failed to create order from draft #${draftOrderId}:`,
      createOrderError?.message,
    );
    throw createOrderError ?? new Error("Failed to create order from draft");
  }
  const orderId = Number(createdOrderId as CreatePaidOrderWithItemsResponse);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error(`Invalid order id returned for draft #${draftOrderId}`);
  }

  const orderLabel = paymentMode === "test" ? "test order" : "order";
  console.log(
    `[stripe-webhook] Draft #${draftOrderId} converted to paid ${orderLabel} #${orderId} (${paymentMode})`,
  );

  try {
    const { sendOrderConfirmationEmail } = await import("./order-confirmation-email.ts");
    await sendOrderConfirmationEmail(orderId);
  } catch (err) {
    console.error(
      `[stripe-webhook] Failed to send order confirmation for #${orderId}:`,
      err,
    );
  }
}

export async function cancelOrderPaymentFailed(
  draftOrderId: number,
  paymentMode: StripePaymentMode,
): Promise<void> {
  console.warn(
    `[stripe-webhook] Payment failed for draft #${draftOrderId} (${paymentMode}); keeping as draft`,
  );
}

export async function getOrderTrackingToken(orderId: number): Promise<string | null> {
  const supabase = createServiceClient();
  return fetchTrackingTokenForPaidOrder(supabase, orderId);
}

export async function getOrderTrackingDetails(
  orderId: number,
): Promise<{ trackingToken: string | null; invoiceNumber: string | null }> {
  const supabase = createServiceClient();
  return fetchTrackingDetailsForPaidOrder(supabase, orderId);
}

export async function getOrderTrackingTokenBySessionId(
  sessionId: string,
): Promise<string | null> {
  const details = await getOrderTrackingDetailsBySessionId(sessionId);
  return details.trackingToken;
}

export async function getOrderTrackingDetailsBySessionId(
  sessionId: string,
): Promise<{ trackingToken: string | null; invoiceNumber: string | null }> {
  const supabase = createServiceClient();
  const orderId = await findOrderIdByStripeSession(supabase, sessionId);
  if (!orderId) return { trackingToken: null, invoiceNumber: null };
  return fetchTrackingDetailsForPaidOrder(supabase, orderId);
}

function getDraftOrderIdFromSession(session: Stripe.Checkout.Session): number | null {
  const fromMetadata = session.metadata?.draftOrderId;
  const fromReference = session.client_reference_id;
  const raw = fromMetadata ?? fromReference ?? "";
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

function getExistingOrderIdFromSession(session: Stripe.Checkout.Session): number | null {
  const raw = session.metadata?.existingOrderId ?? "";
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

async function findExistingOrderIdBySession(
  sessionId: string | null,
  _paymentMode: StripePaymentMode,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<number | null> {
  if (!sessionId) return null;
  return findOrderIdByStripeSession(supabase, sessionId);
}

async function fetchDraftOrder(
  draftOrderId: number,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<DraftOrderRow | null> {
  const { data, error } = await supabase
    .from("draft_orders")
    .select(
      "id, order_type, is_testing, invoice_number, requested_fulfillment_method, customer_account, customer_name, customer_email, customer_phone, store_id, requested_pick_up_store_id, requested_target_date, payment_terms, po_number, subtotal, coupon_code, coupon_discount, wholesale_discount, tax_total, shipping_fee, grand_total, notes, shipping_dba_name, shipping_special_instructions, shipping_preferred_window, shipping_address, shipping_city, shipping_state, shipping_postal_code, shipping_country, billing_legal_name, billing_tax_id, billing_address, billing_city, billing_state, billing_postal_code, billing_country",
    )
    .eq("id", draftOrderId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const orderType = parseOrderType(row.order_type);
  return {
    id: Number(row.id),
    order_type: orderType,
    is_testing: Boolean(row.is_testing),
    invoice_number: (row.invoice_number as string | null) ?? null,
    requested_fulfillment_method:
      parseFulfillmentType(row.requested_fulfillment_method) ??
      resolveFulfillmentType(orderType, null),
    customer_account: (row.customer_account as string | null) ?? null,
    customer_name: (row.customer_name as string | null) ?? null,
    customer_email: (row.customer_email as string | null) ?? null,
    customer_phone: (row.customer_phone as string | null) ?? null,
    store_id: row.store_id == null ? null : Number(row.store_id),
    requested_pick_up_store_id:
      row.requested_pick_up_store_id == null
        ? null
        : Number(row.requested_pick_up_store_id),
    requested_target_date: (row.requested_target_date as string | null) ?? null,
    payment_terms: parsePaymentTerms(row.payment_terms),
    subtotal: row.subtotal as number | string | null,
    coupon_code: (row.coupon_code as string | null) ?? null,
    coupon_discount: row.coupon_discount as number | string | null,
    wholesale_discount: row.wholesale_discount as number | string | null,
    tax_total: row.tax_total as number | string | null,
    shipping_fee: row.shipping_fee as number | string | null,
    grand_total: row.grand_total as number | string | null,
    notes: (row.notes as string | null) ?? null,
    po_number: (row.po_number as string | null) ?? null,
    shipping_dba_name: (row.shipping_dba_name as string | null) ?? null,
    shipping_special_instructions:
      (row.shipping_special_instructions as string | null) ?? null,
    shipping_preferred_window: (row.shipping_preferred_window as string | null) ?? null,
    shipping_address: String(row.shipping_address ?? defaultOrderAddressFields().shipping_address),
    shipping_city: String(row.shipping_city ?? defaultOrderAddressFields().shipping_city),
    shipping_state: String(row.shipping_state ?? defaultOrderAddressFields().shipping_state),
    shipping_postal_code: String(
      row.shipping_postal_code ?? defaultOrderAddressFields().shipping_postal_code,
    ),
    shipping_country: String(row.shipping_country ?? defaultOrderAddressFields().shipping_country),
    billing_legal_name: (row.billing_legal_name as string | null) ?? null,
    billing_tax_id: (row.billing_tax_id as string | null) ?? null,
    billing_address: String(row.billing_address ?? defaultOrderAddressFields().billing_address),
    billing_city: String(row.billing_city ?? defaultOrderAddressFields().billing_city),
    billing_state: String(row.billing_state ?? defaultOrderAddressFields().billing_state),
    billing_postal_code: String(
      row.billing_postal_code ?? defaultOrderAddressFields().billing_postal_code,
    ),
    billing_country: String(row.billing_country ?? defaultOrderAddressFields().billing_country),
  };
}
