import type Stripe from "npm:stripe@17.7.0";
import { createServiceClient } from "./supabase.ts";
import {
  createStripeClient,
  type StripePaymentMode,
  parsePaymentMode,
} from "./stripe.ts";

export type { StripePaymentMode };

export type PickupCheckoutItem = {
  menuItemId: number;
  qty: number;
  unitPrice: number;
  itemName: string;
};

export type PickupCheckoutInput = {
  mode: StripePaymentMode;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  storeId: number;
  pickupTime: string;
  notes?: string;
  origin: string;
  items: PickupCheckoutItem[];
};

export type PickupCheckoutResult = {
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

export function validatePickupCheckoutInput(body: unknown): PickupCheckoutInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;
  const mode = parsePaymentMode(data.mode);
  const customerName = String(data.customerName ?? "").trim();
  const customerEmail = String(data.customerEmail ?? "").trim();
  const customerPhone = String(data.customerPhone ?? "").trim();
  const storeId = Number(data.storeId);
  const pickupTime = String(data.pickupTime ?? "").trim();
  const origin = String(data.origin ?? "").trim();
  const notes = data.notes != null ? String(data.notes).trim() : undefined;

  if (!customerName) throw new Error("Please enter your name");
  if (!customerEmail || !isValidEmail(customerEmail)) {
    throw new Error("Please enter a valid email");
  }
  if (!customerPhone) throw new Error("Please enter your phone number");
  if (!Number.isFinite(storeId) || storeId <= 0) {
    throw new Error("Please select a pickup store");
  }
  if (!pickupTime) throw new Error("Please select a pickup time");
  if (!origin) throw new Error("Missing site origin");

  const rawItems = data.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("Your cart is empty");
  }

  const items: PickupCheckoutItem[] = rawItems.map((raw) => {
    const row = raw as Record<string, unknown>;
    const menuItemId = Number(row.menuItemId);
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
    customerName,
    customerEmail,
    customerPhone,
    storeId,
    pickupTime,
    notes: notes || undefined,
    origin,
    items,
  };
}

export async function createPickupCheckoutSession(
  input: PickupCheckoutInput,
): Promise<PickupCheckoutResult> {
  const supabase = createServiceClient();
  const total = input.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  if (total <= 0) {
    throw new Error("Order total must be greater than zero");
  }

  const { data: draftOrder, error: draftOrderError } = await supabase
    .from("draft_orders")
    .insert({
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      store_id: input.storeId,
      pickup_time: input.pickupTime,
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

  const { data: store, error: storeError } = await supabase
    .from("store_locations")
    .select("id, stripe_connect_account_id, stripe_connect_status, platform_fee_percent")
    .eq("id", input.storeId)
    .maybeSingle();

  if (storeError) {
    throw new Error(storeError.message);
  }

  const storeRow = store as StoreStripeRow | null;
  const connectAccountId = storeRow?.stripe_connect_account_id ?? null;
  const connectStatus = storeRow?.stripe_connect_status ?? null;
  const platformFeePercent = parseFloat(storeRow?.platform_fee_percent ?? "5.00");
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

  const stripeMetadata = {
    draftOrderId: String(draftOrderId),
    mode: input.mode,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    pickupTime: input.pickupTime,
    storeId: String(input.storeId),
  };

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    customer_email: input.customerEmail,
    client_reference_id: String(draftOrderId),
    metadata: stripeMetadata,
    allow_promotion_codes: true,
    success_url: `${input.origin}/checkout/success?sessionId={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/checkout?cancelled=1`,
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
  const existingOrderId = await findExistingOrderIdBySession(session.id, paymentMode, supabase);
  if (existingOrderId) {
    console.log(
      `[stripe-webhook] Session ${session.id} already mapped to ${paymentMode} order #${existingOrderId}`,
    );
    return;
  }
  const draftOrderId = getDraftOrderIdFromSession(session);
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
  const { data: createdOrderId, error: createOrderError } = await supabase.rpc(
    createPaidOrderRpc(paymentMode),
    {
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
    .select("id, customer_name, customer_email, customer_phone, store_id, pickup_time, total, notes, items")
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
