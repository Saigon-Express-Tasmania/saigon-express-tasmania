import { createServiceClient } from "./supabase.ts";
import type { OrderCheckoutItem, OrderFulfillmentType, OrderItemCustomisation } from "./order.ts";
import {
  formatOrderInvoiceNumber,
  type StripePaymentMode,
} from "./order.ts";
import {
  fetchCommerceTaxSettings,
  type CommerceTaxSettings,
} from "./commerce-tax-settings.ts";
import {
  assertCateringShippingFeeMatches,
  resolveCateringShippingFee,
} from "./self-delivery-fee-settings.ts";

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
  customisation?: OrderItemCustomisation | null;
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

export type CateringBillingAddress = {
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
  shippingAddress?: CateringShippingAddress;
  billingAddress: CateringBillingAddress;
  requestedPickUpStoreId?: number | null;
  storeId?: number | null;
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

function parseFinancialDetails(
  value: unknown,
  tax: CommerceTaxSettings,
): CateringFinancialDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid financial details");
  }

  const row = value as Record<string, unknown>;
  const subtotal = Number(row.subtotal_ex_gst);
  const clientGstTotal = Number(row.gst_total);
  const grandTotal = Number(row.grand_total_inc_gst);
  const shippingFee = row.shipping_fee != null ? Number(row.shipping_fee) : 0;

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new Error("Invalid subtotal");
  }
  if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
    throw new Error("Order total must be greater than zero");
  }

  const gstTotal = tax.isGstInclusive
    ? 0
    : Number.isFinite(clientGstTotal) && clientGstTotal >= 0
      ? clientGstTotal
      : 0;

  if (!tax.isGstInclusive && gstTotal < 0) {
    throw new Error("Invalid tax total");
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

function parseOptionalStoreId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const storeId = Number(value);
  if (!Number.isFinite(storeId) || storeId <= 0) {
    throw new Error("Invalid pickup store");
  }
  return storeId;
}

function defaultCateringPickupAddressFields(): CateringShippingAddress {
  return {
    dba_name: "In-store pickup",
    street_1: "In-store pickup",
    street_2: null,
    city: "N/A",
    state: "N/A",
    postal_code: "0000",
    country: "Australia",
    special_instructions: null,
    preferred_window: null,
  };
}

function formatStreetLine(street1: string, street2?: string | null): string {
  const line1 = street1.trim();
  const line2 = street2?.trim();
  return line2 ? `${line1}, ${line2}` : line1;
}

function parseBillingAddress(value: unknown): CateringBillingAddress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Billing address is required");
  }

  const row = value as Record<string, unknown>;
  const legal_name = String(row.legal_name ?? "").trim();
  const street_1 = String(row.street_1 ?? "").trim();
  const city = String(row.city ?? "").trim();
  const postal_code = String(row.postal_code ?? "").trim();

  if (!legal_name) throw new Error("Billing legal name is required");
  if (!street_1) throw new Error("Billing street address is required");
  if (!city) throw new Error("Billing city is required");
  if (!postal_code) throw new Error("Billing postal code is required");

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

    return {
      productId,
      qty,
      unitPrice,
      itemName,
      customisation: parseCateringItemCustomisation(row.customisation),
    };
  });
}

function parseCateringItemCustomisation(
  value: unknown,
): OrderItemCustomisation | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const selections = row.selections;
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) {
    return null;
  }

  const parsedSelections: Record<string, string[]> = {};
  for (const [groupId, ids] of Object.entries(selections)) {
    if (!Array.isArray(ids)) continue;
    parsedSelections[groupId] = ids.filter((id): id is string => typeof id === "string");
  }

  const extraPrice = Number(row.extraPrice ?? 0);
  const qty = Number(row.qty ?? 1);
  const note = typeof row.note === "string" ? row.note : "";

  if (
    Object.values(parsedSelections).every((ids) => ids.length === 0) &&
    !note.trim()
  ) {
    return null;
  }

  return {
    selections: parsedSelections,
    qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
    note,
    extraPrice: Number.isFinite(extraPrice) && extraPrice >= 0 ? extraPrice : 0,
  };
}

export async function validateCateringOrderInput(
  body: unknown,
): Promise<CateringOrderInput> {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const supabase = createServiceClient();
  const commerceTax = await fetchCommerceTaxSettings(supabase);

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

  const requestedPickUpStoreId = parseOptionalStoreId(data.requestedPickUpStoreId);
  const storeId = parseOptionalStoreId(data.storeId);
  const pickUpStoreId = requestedPickUpStoreId ?? storeId;
  const isPickup = fulfillmentType === "pick_up";

  if (isPickup) {
    if (pickUpStoreId == null) {
      throw new Error("Please select a pickup store");
    }
  }

  const shippingAddress = isPickup
    ? defaultCateringPickupAddressFields()
    : parseShippingAddress(data.shippingAddress);
  const billingAddress = parseBillingAddress(data.billingAddress);
  const financialDetails = parseFinancialDetails(data.financialDetails, commerceTax);

  if (!isPickup) {
    const expectedShippingFee = await resolveCateringShippingFee(
      supabase,
      shippingAddress.city,
      shippingAddress.postal_code,
    );
    assertCateringShippingFeeMatches(
      financialDetails.shipping_fee ?? 0,
      expectedShippingFee,
    );
  } else if ((financialDetails.shipping_fee ?? 0) !== 0) {
    throw new Error("Pickup catering orders cannot include a delivery fee");
  }

  return {
    mode,
    customerAccount,
    customerName,
    customerEmail,
    customerPhone,
    fulfillmentType,
    eventDate,
    notes: notes || undefined,
    financialDetails,
    shippingAddress,
    billingAddress,
    requestedPickUpStoreId: isPickup ? pickUpStoreId : null,
    storeId: isPickup ? pickUpStoreId : null,
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
      ...(item.customisation ? { customisation: item.customisation } : {}),
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
  const shipping = input.shippingAddress ?? defaultCateringPickupAddressFields();
  const billing = input.billingAddress;
  const pickUpStoreId = input.requestedPickUpStoreId ?? input.storeId ?? null;
  const financials = input.financialDetails;
  const statusUpdatedAt = new Date().toISOString();

  const orderPayload = {
    order_type: "catering",
    is_testing: input.mode === "test",
    customer_account: input.customerAccount ?? null,
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    customer_phone: input.customerPhone,
    store_id: pickUpStoreId,
    requested_fulfillment_method: input.fulfillmentType,
    requested_target_date: requestedTargetDate,
    requested_pick_up_store_id: pickUpStoreId,
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
    billing_legal_name: billing.legal_name,
    billing_tax_id: billing.tax_id ?? null,
    billing_address: formatStreetLine(billing.street_1, billing.street_2),
    billing_city: billing.city,
    billing_state: billing.state ?? "N/A",
    billing_postal_code: billing.postal_code,
    billing_country: billing.country ?? "Australia",
    payment_terms: billing.payment_terms ?? "prepaid",
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
      customisation: item.customisation ?? null,
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
