import { createServiceClient } from "./supabase.ts";
import type { OrderCheckoutItem, OrderFulfillmentType } from "./order.ts";
import {
  formatOrderInvoiceNumber,
  type StripePaymentMode,
} from "./order.ts";

const ORDER_TOKEN_LENGTH = 12;
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

type ProductOrderFields = {
  sku: string;
  uom: string;
  isCatchWeight: boolean;
};

export type CateringOrderItemInput = {
  productId: number;
  qty: number;
  unitPrice: number;
  itemName: string;
};

export type CateringFinancialDetails = {
  subtotal_ex_gst: number;
  gst_total: number;
  grand_total_inc_gst: number;
  shipping_fee?: number;
  coupon_code?: string | null;
  coupon_discount?: number;
  currency?: string;
};

export type CateringShippingAddress = {
  dba_name: string;
  street_1: string;
  street_2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  special_instructions?: string | null;
  preferred_window?: string | null;
};

export type CateringOrderInput = {
  mode: StripePaymentMode;
  customerAccount?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: OrderFulfillmentType;
  eventDate: string;
  notes?: string;
  financialDetails: CateringFinancialDetails;
  shippingAddress: CateringShippingAddress;
  items: CateringOrderItemInput[];
};

export type CateringOrderResult = {
  orderId: number;
  trackingToken: string;
  cancelToken: string;
  invoiceNumber: string;
};

function randomCrockfordBase32(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CROCKFORD_ALPHABET[bytes[i] % CROCKFORD_ALPHABET.length];
  }
  return result;
}

function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parsePaymentMode(value: unknown): StripePaymentMode {
  return String(value ?? "test").trim().toLowerCase() === "live" ? "live" : "test";
}

function parseFulfillmentType(value: unknown): OrderFulfillmentType {
  const raw = String(value ?? "delivery").trim().toLowerCase();
  if (raw === "pick_up" || raw === "pickup") return "pick_up";
  if (raw === "shipping") return "shipping";
  return "delivery";
}

function parseRequestedTargetDate(eventDate: string): string {
  const raw = eventDate.trim();
  if (!raw) {
    throw new Error("Please select an event date");
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T09:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  throw new Error("Please select a valid event date");
}

function parseFinancialDetails(value: unknown): CateringFinancialDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid financial details");
  }

  const row = value as Record<string, unknown>;
  const subtotal = Number(row.subtotal_ex_gst);
  const gstTotal = Number(row.gst_total);
  const grandTotal = Number(row.grand_total_inc_gst);
  const shippingFee = row.shipping_fee != null ? Number(row.shipping_fee) : 0;

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new Error("Invalid subtotal");
  }
  if (!Number.isFinite(gstTotal) || gstTotal < 0) {
    throw new Error("Invalid tax total");
  }
  if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
    throw new Error("Order total must be greater than zero");
  }

  return {
    subtotal_ex_gst: subtotal,
    gst_total: gstTotal,
    grand_total_inc_gst: grandTotal,
    shipping_fee: Number.isFinite(shippingFee) ? shippingFee : 0,
    coupon_code: row.coupon_code != null ? String(row.coupon_code).trim() || null : null,
    coupon_discount: row.coupon_discount != null ? Number(row.coupon_discount) : 0,
    currency: row.currency != null ? String(row.currency) : "AUD",
  };
}

function parseShippingAddress(value: unknown): CateringShippingAddress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Delivery address is required");
  }

  const row = value as Record<string, unknown>;
  const street_1 = String(row.street_1 ?? "").trim();
  const city = String(row.city ?? "").trim();
  const state = String(row.state ?? "").trim();
  const postal_code = String(row.postal_code ?? "").trim();
  const country = String(row.country ?? "Australia").trim() || "Australia";
  const dba_name = String(row.dba_name ?? "").trim();

  if (!street_1) throw new Error("Delivery street address is required");
  if (!city) throw new Error("Delivery city is required");
  if (!state) throw new Error("Delivery state is required");
  if (!postal_code) throw new Error("Delivery postal code is required");

  return {
    dba_name,
    street_1,
    street_2: row.street_2 != null ? String(row.street_2).trim() || null : null,
    city,
    state,
    postal_code,
    country,
    special_instructions:
      row.special_instructions != null
        ? String(row.special_instructions).trim() || null
        : null,
    preferred_window:
      row.preferred_window != null ? String(row.preferred_window).trim() || null : null,
  };
}

function parseItems(value: unknown): CateringOrderItemInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Your cart is empty");
  }

  return value.map((raw) => {
    const row = raw as Record<string, unknown>;
    const productId = Number(row.menuItemId ?? row.productId);
    const qty = Number(row.qty);
    const unitPrice = Number(row.unitPrice);
    const itemName = String(row.itemName ?? "").trim();

    if (!Number.isFinite(productId) || productId <= 0) {
      throw new Error("Invalid product");
    }
    if (!Number.isFinite(qty) || qty < 1) {
      throw new Error("Invalid quantity");
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error("Invalid price");
    }
    if (!itemName) {
      throw new Error("Invalid item name");
    }

    return { productId, qty, unitPrice, itemName };
  });
}

export function validateCateringOrderInput(body: unknown): CateringOrderInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;
  const mode = parsePaymentMode(data.mode);
  const customerAccountRaw = data.customerAccount;
  const customerAccount =
    customerAccountRaw == null || String(customerAccountRaw).trim() === ""
      ? null
      : String(customerAccountRaw).trim();
  const customerName = String(data.customerName ?? "").trim();
  const customerEmail = String(data.customerEmail ?? "").trim();
  const customerPhone = String(data.customerPhone ?? "").trim();
  const fulfillmentType = parseFulfillmentType(data.fulfillmentType);
  const eventDate = String(data.pickupTime ?? data.eventDate ?? "").trim();
  const notes = data.notes != null ? String(data.notes).trim() : undefined;

  if (customerAccount && !isValidUuid(customerAccount)) {
    throw new Error("Invalid customer account");
  }
  if (!customerName) throw new Error("Please enter your name");
  if (!customerEmail || !isValidEmail(customerEmail)) {
    throw new Error("Please enter a valid email");
  }
  if (!customerPhone) throw new Error("Please enter your phone number");

  return {
    mode,
    customerAccount,
    customerName,
    customerEmail,
    customerPhone,
    fulfillmentType,
    eventDate,
    notes: notes || undefined,
    financialDetails: parseFinancialDetails(data.financialDetails),
    shippingAddress: parseShippingAddress(data.shippingAddress),
    items: parseItems(data.items),
  };
}

async function fetchProductsForOrderItems(
  productIds: number[],
): Promise<Map<number, ProductOrderFields>> {
  const supabase = createServiceClient();
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

    productsById.set(id, {
      sku,
      uom: String(record.uom ?? "EACH").trim() || "EACH",
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

function buildItemsPayload(
  items: OrderCheckoutItem[],
  productsById: Map<number, ProductOrderFields>,
): Record<string, unknown>[] {
  return items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new Error(`Product #${item.productId} not found`);
    }

    const lineTotal = item.qty * item.unitPrice;
    return {
      product_id: item.productId,
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

export async function createPendingCateringOrder(
  input: CateringOrderInput,
): Promise<CateringOrderResult> {
  const supabase = createServiceClient();
  const productsById = await fetchProductsForOrderItems(
    input.items.map((item) => item.productId),
  );

  const cancelToken = randomCrockfordBase32(ORDER_TOKEN_LENGTH);
  const trackingToken = randomCrockfordBase32(ORDER_TOKEN_LENGTH);
  const requestedTargetDate = parseRequestedTargetDate(input.eventDate);
  const shipping = input.shippingAddress;
  const financials = input.financialDetails;
  const statusUpdatedAt = new Date().toISOString();

  const orderPayload = {
    order_type: "catering",
    is_testing: input.mode === "test",
    customer_account: input.customerAccount ?? null,
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    customer_phone: input.customerPhone,
    requested_fulfillment_method: input.fulfillmentType,
    requested_target_date: requestedTargetDate,
    cancel_token: cancelToken,
    tracking_token: trackingToken,
    shipping_dba_name: shipping.dba_name || input.customerName,
    shipping_special_instructions: shipping.special_instructions,
    shipping_preferred_window: shipping.preferred_window,
    shipping_address: shipping.street_1,
    shipping_city: shipping.city,
    shipping_state: shipping.state,
    shipping_postal_code: shipping.postal_code,
    shipping_country: shipping.country,
    billing_legal_name: shipping.dba_name || input.customerName,
    billing_address: shipping.street_1,
    billing_city: shipping.city,
    billing_state: shipping.state,
    billing_postal_code: shipping.postal_code,
    billing_country: shipping.country,
    payment_terms: "prepaid",
    subtotal: formatMoney(financials.subtotal_ex_gst),
    coupon_code: financials.coupon_code,
    coupon_discount: formatMoney(financials.coupon_discount ?? 0),
    wholesale_discount: formatMoney(0),
    tax_total: formatMoney(financials.gst_total),
    shipping_fee: formatMoney(financials.shipping_fee ?? 0),
    grand_total: formatMoney(financials.grand_total_inc_gst),
    notes: input.notes ?? null,
    status_updated_at: statusUpdatedAt,
  };

  const itemsPayload = buildItemsPayload(
    input.items.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      unitPrice: item.unitPrice,
      itemName: item.itemName,
    })),
    productsById,
  );

  const { data, error } = await supabase.rpc("create_pending_catering_order", {
    p_order_payload: orderPayload,
    p_items: itemsPayload,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data as Record<string, unknown> | null;
  const orderId = Number(result?.order_id);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error("Failed to create catering order");
  }

  return {
    orderId,
    trackingToken: String(result?.tracking_token ?? trackingToken),
    cancelToken: String(result?.cancel_token ?? cancelToken),
    invoiceNumber: String(
      result?.invoice_number ?? formatOrderInvoiceNumber(orderId, requestedTargetDate),
    ),
  };
}

export type CancelCateringOrderInput = {
  orderId: number;
  cancelToken: string;
  customerAccount?: string | null;
};

export type CancelCateringOrderResult = {
  orderId: number;
};

export function validateCancelCateringOrderInput(body: unknown): CancelCateringOrderInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;
  const orderId = Number(data.orderId);
  const cancelToken = String(data.cancelToken ?? "").trim();
  const customerAccountRaw = data.customerAccount;
  const customerAccount =
    customerAccountRaw == null || String(customerAccountRaw).trim() === ""
      ? null
      : String(customerAccountRaw).trim();

  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error("Invalid order id");
  }

  if (!cancelToken) {
    throw new Error("cancel_token is required");
  }

  if (customerAccount && !isValidUuid(customerAccount)) {
    throw new Error("Invalid customer account");
  }

  return { orderId, cancelToken, customerAccount };
}

export async function cancelCateringOrder(
  input: CancelCateringOrderInput,
): Promise<CancelCateringOrderResult> {
  const supabase = createServiceClient();
  const archivedReason = input.customerAccount
    ? "cancelled_by_member"
    : "cancelled_by_guest";

  const { data, error } = await supabase.rpc("cancel_catering_order", {
    p_order_id: input.orderId,
    p_cancel_token: input.cancelToken,
    p_customer_account: input.customerAccount ?? null,
    p_archived_reason: archivedReason,
  });

  if (error) {
    throw new Error(error.message);
  }

  const orderId = Number(data);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error("Failed to cancel catering order");
  }

  return { orderId };
}
