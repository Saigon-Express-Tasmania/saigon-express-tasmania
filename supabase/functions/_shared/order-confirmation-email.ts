import { sendEmail } from "./send-email/index.ts";
import { renderExtensionVariables } from "./send-email/render-template.ts";
import { createServiceClient } from "./supabase.ts";

const ORDER_CONFIRMATION_TEMPLATE = "order_confirmation";
const DEFAULT_SENDER_EMAIL = "info@saigonexpress.com.au";
const DEFAULT_SENDER_NAME = "Saigon Express Tasmania";
const DEFAULT_SITE_ORIGIN = "https://saigonexpress.com.au";

type OrderFulfillmentMethod = "pick_up" | "delivery" | "shipping";

type OrderConfirmationRow = {
  id: number;
  status: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  subtotal: number | string | null;
  tax_total: number | string | null;
  shipping_fee: number | string | null;
  grand_total: number | string | null;
  tracking_token: string | null;
  requested_target_date: string | null;
  requested_fulfillment_method: OrderFulfillmentMethod;
  requested_pick_up_store_id: number | null;
  store_id: number | null;
  shipping_dba_name: string | null;
  billing_legal_name: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
};

type StoreLocationRow = {
  name: string;
  address: string;
  suburb: string | null;
};

type OrderItemRow = {
  name: string;
  quantity: number | string;
  sku: string;
  uom: string;
  is_catch_weight: boolean;
  line_total: number | string;
};

type EmailTemplateRow = {
  subject: string;
  html_body: string;
  html_extensions: string[] | null;
};

function getSiteOrigin(): string {
  const raw = Deno.env.get("SITE_URL") ??
    Deno.env.get("APP_URL") ??
    Deno.env.get("NEXT_PUBLIC_SITE_URL") ??
    DEFAULT_SITE_ORIGIN;
  return raw.replace(/\/$/, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPickupFulfillment(method: OrderFulfillmentMethod): boolean {
  return method === "pick_up";
}

function formatCurrency(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "$0.00";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}

function formatOrderDate(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Hobart",
  }).format(new Date(parsed));
}

function formatOrderStatusLabel(status: string | null | undefined): string {
  const raw = String(status ?? "confirmed").trim().toLowerCase();
  if (!raw) return "Confirmed";
  return raw
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCustomerName(order: OrderConfirmationRow): string {
  const contactName = order.customer_name?.trim() || "Customer";
  const businessName = order.shipping_dba_name?.trim() ||
    order.billing_legal_name?.trim();

  if (!businessName || businessName === contactName) {
    return contactName;
  }

  return `${contactName}`;
}

function formatShippingType(method: OrderFulfillmentMethod): string {
  return isPickupFulfillment(method) ? "Pickup" : "Shipping";
}

function formatBillingAddress(order: OrderConfirmationRow): string {
  const parts = [
    order.billing_legal_name?.trim(),
    order.billing_address?.trim(),
    [order.billing_city, order.billing_state, order.billing_postal_code]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" "),
    order.billing_country?.trim(),
  ].filter((part) => part && part !== "N/A");

  return parts.join("\n");
}

function formatPickupStoreAddress(store: StoreLocationRow): string {
  return [store.name, store.address]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n");
}

function formatDeliveryShippingAddress(order: OrderConfirmationRow): string {
  const parts = [
    order.shipping_dba_name?.trim(),
    order.shipping_address?.trim(),
    [order.shipping_city, order.shipping_state, order.shipping_postal_code]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" "),
    order.shipping_country?.trim(),
  ].filter((part) => part && part !== "N/A");

  return parts.join("\n");
}

function formatShippingAddress(
  order: OrderConfirmationRow,
  pickupStore: StoreLocationRow | null,
): string {
  if (isPickupFulfillment(order.requested_fulfillment_method)) {
    if (pickupStore) return formatPickupStoreAddress(pickupStore);
    return "Pickup location to be confirmed";
  }

  return formatDeliveryShippingAddress(order);
}

function formatItemSpecs(item: OrderItemRow): string {
  const parts = [item.sku.trim(), item.uom.trim()];
  if (item.is_catch_weight) parts.push("Catch weight");
  return parts.filter(Boolean).join(" · ");
}

function formatItemQuantity(quantity: number | string): string {
  const value = Number(quantity);
  if (!Number.isFinite(value)) return String(quantity);
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function buildOrderItemTemplateRows(
  items: OrderItemRow[],
): Record<string, string | number | boolean>[] {
  return items.map((item) => ({
    quantity: formatItemQuantity(item.quantity),
    itemName: item.name,
    itemSpecs: formatItemSpecs(item),
    itemPrice: formatCurrency(item.line_total),
  }));
}

function resolvePickupStoreId(order: OrderConfirmationRow): number | null {
  return order.requested_pick_up_store_id ?? order.store_id;
}

async function fetchOrderConfirmationTemplate(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<EmailTemplateRow | null> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_body, html_extensions")
    .eq("name", ORDER_CONFIRMATION_TEMPLATE)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load ${ORDER_CONFIRMATION_TEMPLATE} template: ${error.message}`,
    );
  }

  return (data as EmailTemplateRow | null) ?? null;
}

async function fetchOrderForConfirmation(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
): Promise<OrderConfirmationRow | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, status, created_at, customer_name, customer_email, subtotal, tax_total, shipping_fee, grand_total, tracking_token, requested_target_date, requested_fulfillment_method, requested_pick_up_store_id, store_id, shipping_dba_name, billing_legal_name, shipping_address, shipping_city, shipping_state, shipping_postal_code, shipping_country, billing_address, billing_city, billing_state, billing_postal_code, billing_country",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load order #${orderId}: ${error.message}`);
  }

  return (data as OrderConfirmationRow | null) ?? null;
}

async function fetchPickupStore(
  supabase: ReturnType<typeof createServiceClient>,
  storeId: number,
): Promise<StoreLocationRow | null> {
  const { data, error } = await supabase
    .from("store_locations")
    .select("name, address, suburb")
    .eq("id", storeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load store #${storeId}: ${error.message}`);
  }

  return (data as StoreLocationRow | null) ?? null;
}

async function fetchOrderItemsForConfirmation(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
): Promise<OrderItemRow[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("name, quantity, sku, uom, is_catch_weight, line_total")
    .eq("order_id", orderId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load items for order #${orderId}: ${error.message}`);
  }

  return (data ?? []) as OrderItemRow[];
}

async function fetchSettingsByKeys(
  supabase: ReturnType<typeof createServiceClient>,
  keys: string[],
): Promise<Record<string, string>> {
  const trimmedKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  if (trimmedKeys.length === 0) return {};

  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", trimmedKeys);

  if (error) {
    throw new Error(`Failed to load settings: ${error.message}`);
  }

  return (data ?? []).reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function sendOrderConfirmationEmail(orderId: number): Promise<void> {
  const supabase = createServiceClient();
  const order = await fetchOrderForConfirmation(supabase, orderId);

  if (!order) {
    console.warn(`[order-confirmation] Order #${orderId} not found; skipping email`);
    return;
  }

  const recipientEmail = order.customer_email?.trim() ?? "";
  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    console.warn(
      `[order-confirmation] Order #${orderId} has no valid customer email; skipping`,
    );
    return;
  }

  const pickupStoreId = isPickupFulfillment(order.requested_fulfillment_method)
    ? resolvePickupStoreId(order)
    : null;

  const [items, template, pickupStore, settings] = await Promise.all([
    fetchOrderItemsForConfirmation(supabase, orderId),
    fetchOrderConfirmationTemplate(supabase),
    pickupStoreId
      ? fetchPickupStore(supabase, pickupStoreId)
      : Promise.resolve(null),
    fetchSettingsByKeys(supabase, ["contact_us_phone_number"]),
  ]);

  if (!template?.html_body?.trim()) {
    throw new Error(`Email template ${ORDER_CONFIRMATION_TEMPLATE} not found`);
  }

  if (!template.html_extensions?.[0]?.trim()) {
    throw new Error(
      `Email template ${ORDER_CONFIRMATION_TEMPLATE} is missing extension_1 in html_extensions`,
    );
  }

  const trackingToken = order.tracking_token?.trim() ?? "";
  const trackingUrl = trackingToken
    ? `${getSiteOrigin()}/order-tracking/${trackingToken}`
    : `${getSiteOrigin()}/order-tracking`;

  const itemRows = buildOrderItemTemplateRows(items);
  const extensionVariables = renderExtensionVariables(
    template.html_extensions,
    itemRows,
  );
  const templateVariables: Record<string, string | number | boolean> = {
    orderId: `SE-${order.id}`,
    orderCreatedAt: formatOrderDate(order.created_at),
    customerName: formatCustomerName(order),
    shippingAddress: formatShippingAddress(order, pickupStore),
    orderStatus: formatOrderStatusLabel(order.status),
    deliveryBy: formatOrderDate(order.requested_target_date),
    subtotal: formatCurrency(order.subtotal),
    taxTotal: formatCurrency(order.tax_total),
    shippingFee: formatCurrency(order.shipping_fee),
    grandTotal: formatCurrency(order.grand_total),
    contact_phone: settings.contact_us_phone_number?.trim() ?? "",
    shippingType: formatShippingType(order.requested_fulfillment_method),
    billingAddress: formatBillingAddress(order),
    trackingUrl,
    ...extensionVariables,
  };

  await sendEmail({
    senderEmail: DEFAULT_SENDER_EMAIL,
    senderName: DEFAULT_SENDER_NAME,
    recipientEmails: [recipientEmail],
    templateId: ORDER_CONFIRMATION_TEMPLATE,
    templateVarialbles: templateVariables,
  });

  console.log(
    `[order-confirmation] Sent ${ORDER_CONFIRMATION_TEMPLATE} for order #${orderId} to ${recipientEmail}`,
  );
}
