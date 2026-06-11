import type Stripe from "npm:stripe@17.7.0";
import { createServiceClient } from "./supabase.ts";
import {
  createStripeClient,
  type StripePaymentMode,
  parsePaymentMode,
} from "./stripe.ts";

export type { StripePaymentMode };

export type OrderType = "pickup" | "wholesale";

export type OrderCheckoutItem = {
  menuItemId: number;
  qty: number;
  unitPrice: number;
  itemName: string;
};

export type OrderCheckoutInput = {
  mode: StripePaymentMode;
  orderType: OrderType;
  customerAccount?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  storeId?: number | null;
  pickupTime?: string;
  notes?: string;
  origin: string;
  returnTo?: string;
  successReturnTo?: string;
  items: OrderCheckoutItem[];
};

export type OrderCheckoutResult = {
  url: string | null;
  draftOrderId: number;
  mode: StripePaymentMode;
};

type StoreStripeRow = {
  id: number;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string | null;
  platform_fee_percent: string | null;
};

type DraftOrderItemRow = {
  menuItemId: number;
  qty: number;
  unitPrice: number;
  itemName: string;
};

type DraftOrderRow = {
  id: number;
  order_type: OrderType;
  customer_account: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  store_id: number | null;
  pickup_time: string | null;
  total: number | string | null;
  notes: string | null;
  items: unknown;
};

type CreatePaidOrderWithItemsResponse = number;

type PaidOrdersTable = "orders" | "test_orders";

function paidOrdersTable(mode: StripePaymentMode): PaidOrdersTable {
  return mode === "test" ? "test_orders" : "orders";
}

function createPaidOrderRpc(mode: StripePaymentMode): string {
  return mode === "test" ? "create_paid_test_order_with_items" : "create_paid_order_with_items";
}

function paymentModeFromStripeSessionId(sessionId: string): StripePaymentMode | null {
  if (sessionId.startsWith("cs_test_")) return "test";
  if (sessionId.startsWith("cs_live_")) return "live";
  return null;
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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
  if (raw === "pickup") return "pickup";
  throw new Error("Invalid order type");
}

function parseOptionalStoreId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const storeId = Number(value);
  if (!Number.isFinite(storeId) || storeId <= 0) {
    throw new Error("Invalid store");
  }
  return storeId;
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

export function validateOrderCheckoutInput(body: unknown): OrderCheckoutInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;
  const mode = parsePaymentMode(data.mode);
  const orderType = parseOrderType(data.orderType);
  const customerName = String(data.customerName ?? "").trim();
  const customerEmail = String(data.customerEmail ?? "").trim();
  const customerPhone = String(data.customerPhone ?? "").trim();
  const storeId = parseOptionalStoreId(data.storeId);
  const pickupTimeRaw = data.pickupTime != null ? String(data.pickupTime).trim() : "";
  const origin = String(data.origin ?? "").trim();
  const notes = data.notes != null ? String(data.notes).trim() : undefined;
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
  if (!origin) throw new Error("Missing site origin");

  const pickupTime =
    pickupTimeRaw || (orderType === "wholesale" ? "To be arranged" : "");

  if (orderType === "wholesale" && !customerAccount) {
    throw new Error("Please sign in to place a wholesale order");
  }

  const rawItems = data.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("Your cart is empty");
  }

  const items: OrderCheckoutItem[] = rawItems.map((raw) => {
    const row = raw as Record<string, unknown>;
    const menuItemId = Number(row.menuItemId ?? row.productId);
    const qty = Number(row.qty);
    const unitPrice = Number(row.unitPrice);
    const itemName = String(row.itemName ?? "").trim();

    if (!Number.isFinite(menuItemId) || menuItemId <= 0) throw new Error("Invalid menu item");
    if (!Number.isFinite(qty) || qty < 1) throw new Error("Invalid quantity");
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Invalid price");
    if (!itemName) throw new Error("Invalid item name");

    return { menuItemId, qty, unitPrice, itemName };
  });

  return {
    mode,
    orderType,
    customerAccount,
    customerName,
    customerEmail,
    customerPhone,
    storeId,
    pickupTime,
    notes: notes || undefined,
    origin,
    returnTo: returnTo || undefined,
    successReturnTo: successReturnTo || undefined,
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

async function validateWholesaleInventoryAvailability(
  supabase: ReturnType<typeof createServiceClient>,
  customerAccount: string,
  items: OrderCheckoutItem[],
): Promise<void> {
  const qtyByProduct = new Map<number, { qty: number; itemName: string }>();

  for (const item of items) {
    const existing = qtyByProduct.get(item.menuItemId);
    qtyByProduct.set(item.menuItemId, {
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
  const total = input.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  if (total <= 0) {
    throw new Error("Order total must be greater than zero");
  }

  if (input.orderType === "wholesale" && input.customerAccount) {
    await validateWholesaleInventoryAvailability(
      supabase,
      input.customerAccount,
      input.items,
    );
  }

  const { data: draftOrder, error: draftOrderError } = await supabase
    .from("draft_orders")
    .insert({
      order_type: input.orderType,
      customer_account: input.customerAccount ?? null,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      store_id: input.storeId ?? null,
      pickup_time: input.pickupTime ?? null,
      total: total.toFixed(2),
      notes: input.notes ?? null,
      items: input.items,
    })
    .select("id")
    .single();

  if (draftOrderError || !draftOrder) {
    throw new Error(draftOrderError?.message ?? "Failed to create draft order");
  }
  const draftOrderId = draftOrder.id as number;

  let connectAccountId: string | null = null;
  let connectStatus: string | null = null;
  let platformFeePercent = 5;

  if (input.storeId != null) {
    const { data: store, error: storeError } = await supabase
      .from("store_locations")
      .select("id, stripe_connect_account_id, stripe_connect_status, platform_fee_percent")
      .eq("id", input.storeId)
      .maybeSingle();

    if (storeError) {
      throw new Error(storeError.message);
    }

    const storeRow = store as StoreStripeRow | null;
    connectAccountId = storeRow?.stripe_connect_account_id ?? null;
    connectStatus = storeRow?.stripe_connect_status ?? null;
    platformFeePercent = parseFloat(storeRow?.platform_fee_percent ?? "5.00");
  }
  const totalCents = Math.round(total * 100);
  const platformFeeCents =
    connectAccountId && connectStatus === "active"
      ? Math.round(totalCents * platformFeePercent / 100)
      : 0;

  const stripe = createStripeClient(input.mode);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.items.map((item) => ({
    price_data: {
      currency: "aud",
      product_data: { name: item.itemName },
      unit_amount: Math.round(item.unitPrice * 100),
    },
    quantity: item.qty,
  }));

  const stripeMetadata: Record<string, string> = {
    draftOrderId: String(draftOrderId),
    mode: input.mode,
    orderType: input.orderType,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    pickupTime: input.pickupTime ?? "",
    storeId: input.storeId != null ? String(input.storeId) : "",
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
  const draftOrderId = getDraftOrderIdFromSession(session);
  const existingOrderId = await findExistingOrderIdBySession(session.id, paymentMode, supabase);
  if (existingOrderId) {
    if (draftOrderId) {
      await supabase.from("draft_orders").delete().eq("id", draftOrderId);
    }
    console.log(
      `[stripe-webhook] Session ${session.id} already mapped to ${paymentMode} order #${existingOrderId}`,
    );
    return;
  }
  if (!draftOrderId) return;
  const draftOrder = await fetchDraftOrder(draftOrderId, supabase);
  if (!draftOrder) {
    console.error(`[stripe-webhook] Draft order #${draftOrderId} not found`);
    return;
  }

  const total = Number(draftOrder.total ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error(`Invalid draft order total for #${draftOrderId}`);
  }
  const parsedItems = parseDraftItems(draftOrder.items);
  if (parsedItems.length === 0) {
    throw new Error(`Draft order #${draftOrderId} has no valid items`);
  }

  const cancelToken = randomHex(24);
  const trackingToken = randomHex(24);
  const customerAccount = resolveCustomerAccount(draftOrder, session);
  const { data: createdOrderId, error: createOrderError } = await supabase.rpc(
    createPaidOrderRpc(paymentMode),
    {
      p_order_type: draftOrder.order_type,
      p_customer_account: customerAccount,
      p_customer_name: draftOrder.customer_name ?? "",
      p_customer_email: draftOrder.customer_email ?? "",
      p_customer_phone: draftOrder.customer_phone ?? "",
      p_store_id: draftOrder.store_id,
      p_pickup_time: draftOrder.pickup_time ?? "",
      p_total: total.toFixed(2),
      p_notes: draftOrder.notes ?? null,
      p_stripe_mode: paymentMode,
      p_stripe_checkout_session_id: session.id,
      p_cancel_token: cancelToken,
      p_tracking_token: trackingToken,
      p_status_updated_at: new Date().toISOString(),
      p_items: parsedItems,
      p_draft_order_id: draftOrderId,
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
  for (const table of ["test_orders", "orders"] as const) {
    const token = await fetchPaidOrderTrackingToken(supabase, table, "id", orderId);
    if (token) return token;
  }
  return null;
}

export async function getOrderTrackingTokenBySessionId(sessionId: string): Promise<string | null> {
  const mode = paymentModeFromStripeSessionId(sessionId);
  const supabase = createServiceClient();

  if (mode) {
    return fetchPaidOrderTrackingToken(
      supabase,
      paidOrdersTable(mode),
      "stripe_checkout_session_id",
      sessionId,
    );
  }

  for (const table of ["test_orders", "orders"] as const) {
    const token = await fetchPaidOrderTrackingToken(
      supabase,
      table,
      "stripe_checkout_session_id",
      sessionId,
    );
    if (token) return token;
  }
  return null;
}

function getDraftOrderIdFromSession(session: Stripe.Checkout.Session): number | null {
  const fromMetadata = session.metadata?.draftOrderId;
  const fromReference = session.client_reference_id;
  const raw = fromMetadata ?? fromReference ?? "";
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

async function findExistingOrderIdBySession(
  sessionId: string | null,
  paymentMode: StripePaymentMode,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<number | null> {
  if (!sessionId) return null;
  const { data, error } = await supabase
    .from(paidOrdersTable(paymentMode))
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  return Number(data.id) || null;
}

async function fetchPaidOrderTrackingToken(
  supabase: ReturnType<typeof createServiceClient>,
  table: PaidOrdersTable,
  column: "id" | "stripe_checkout_session_id",
  value: number | string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from(table)
    .select("tracking_token, payment_status")
    .eq(column, value)
    .maybeSingle();

  if (error || !data) return null;
  if (data.payment_status !== "paid") return null;
  return (data.tracking_token as string | null) ?? null;
}

async function fetchDraftOrder(
  draftOrderId: number,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<DraftOrderRow | null> {
  const { data, error } = await supabase
    .from("draft_orders")
    .select(
      "id, order_type, customer_account, customer_name, customer_email, customer_phone, store_id, pickup_time, total, notes, items",
    )
    .eq("id", draftOrderId)
    .maybeSingle();

  if (error || !data) return null;
  return data as DraftOrderRow;
}

function parseDraftItems(items: unknown): DraftOrderItemRow[] {
  if (!Array.isArray(items)) return [];
  const parsed: DraftOrderItemRow[] = [];

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const menuItemId = Number(item.menuItemId);
    const qty = Number(item.qty);
    const unitPrice = Number(item.unitPrice);
    const itemName = String(item.itemName ?? "").trim();

    if (!Number.isFinite(menuItemId) || menuItemId <= 0) continue;
    if (!Number.isFinite(qty) || qty < 1) continue;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
    if (!itemName) continue;

    parsed.push({ menuItemId, qty, unitPrice, itemName });
  }

  return parsed;
}
