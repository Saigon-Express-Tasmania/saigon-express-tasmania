import Stripe from "npm:stripe@17.7.0";
import { createServiceClient } from "./supabase.ts";

export type PickupCheckoutItem = {
  menuItemId: number;
  qty: number;
  unitPrice: number;
  itemName: string;
};

export type PickupCheckoutInput = {
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
  orderId: number;
};

type StoreStripeRow = {
  id: number;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string | null;
  platform_fee_percent: string | null;
};

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getStripe(): Stripe {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(secretKey);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePickupCheckoutInput(body: unknown): PickupCheckoutInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;
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

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      store_id: input.storeId,
      pickup_time: input.pickupTime,
      total: total.toFixed(2),
      notes: input.notes ?? null,
      status: "pending",
      payment_status: "unpaid",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Failed to create order");
  }

  const orderId = order.id as number;

  const { error: itemsError } = await supabase.from("order_items").insert(
    input.items.map((item) => ({
      order_id: orderId,
      menu_item_id: item.menuItemId,
      qty: item.qty,
      unit_price: item.unitPrice.toFixed(2),
      item_name: item.itemName,
    })),
  );

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", orderId);
    throw new Error(itemsError.message);
  }

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

  const stripe = getStripe();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.items.map((item) => ({
    price_data: {
      currency: "aud",
      product_data: { name: item.itemName },
      unit_amount: Math.round(item.unitPrice * 100),
    },
    quantity: item.qty,
  }));

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    customer_email: input.customerEmail,
    client_reference_id: String(orderId),
    metadata: {
      orderId: String(orderId),
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      pickupTime: input.pickupTime,
      storeId: String(input.storeId),
    },
    allow_promotion_codes: true,
    success_url: `${input.origin}/checkout/success?orderId=${orderId}`,
    cancel_url: `${input.origin}/checkout?cancelled=1`,
    payment_intent_data: {
      metadata: { orderId: String(orderId) },
      ...(connectAccountId && connectStatus === "active"
        ? {
            application_fee_amount: platformFeeCents,
            transfer_data: { destination: connectAccountId },
          }
        : {}),
    },
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  const { error: updateError } = await supabase
    .from("orders")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", orderId);

  if (updateError) {
    console.error("[checkout-pickup] Failed to save Stripe session id:", updateError.message);
  }

  return { url: session.url, orderId };
}

export async function markOrderPaidFromStripeSession(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const orderId = session.metadata?.orderId ? parseInt(session.metadata.orderId, 10) : null;
  if (!orderId || Number.isNaN(orderId)) return;

  const supabase = createServiceClient();
  const cancelToken = randomHex(24);
  const trackingToken = randomHex(24);

  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      status: "confirmed",
      cancel_token: cancelToken,
      tracking_token: trackingToken,
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error(`[stripe-webhook] Failed to update order #${orderId}:`, error.message);
    throw error;
  }

  console.log(`[stripe-webhook] Order #${orderId} marked as paid + confirmed`);
}

export async function cancelOrderPaymentFailed(orderId: number): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);

  if (error) {
    console.error(`[stripe-webhook] Failed to cancel order #${orderId}:`, error.message);
  }
}

export async function getOrderTrackingToken(orderId: number): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("tracking_token, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.payment_status !== "paid") return null;
  return (data.tracking_token as string | null) ?? null;
}
