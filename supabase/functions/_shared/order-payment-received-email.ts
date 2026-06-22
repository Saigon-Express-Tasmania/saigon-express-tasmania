import { sendEmail } from "./send-email/index.ts";
import { renderExtensionVariables } from "./send-email/render-template.ts";
import { createServiceClient } from "./supabase.ts";

const ORDER_PAYMENT_RECEIVED_TEMPLATE = "order_payment_received";
const ORDER_NOTIFY_EMAIL_SETTING = "order_notify_email";
const DEFAULT_SENDER_EMAIL = "info@saigonexpress.com.au";
const DEFAULT_SENDER_NAME = "Saigon Express Tasmania";

type OrderFulfillmentMethod = "pick_up" | "delivery" | "shipping";

type OrderPaymentReceivedRow = {
  id: number;
  status: string;
  order_type: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  subtotal: number | string | null;
  coupon_discount: number | string | null;
  wholesale_discount: number | string | null;
  tax_total: number | string | null;
  shipping_fee: number | string | null;
  grand_total: number | string | null;
  requested_target_date: string | null;
  requested_fulfillment_method: OrderFulfillmentMethod;
  requested_pick_up_store_id: number | null;
  store_id: number | null;
  shipping_dba_name: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  billing_legal_name: string | null;
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

type PaidPaymentRow = {
  created_at: string;
};

function adminOrderUrlSettingKey(orderType: string): string {
  return `admin_${orderType.trim().toLowerCase()}_order_url`;
}

function buildAdminOrderUrl(baseUrl: string, orderId: number): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  return `${trimmed}/${orderId}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseRecipientEmails(value: string): string[] {
  return [...new Set(
    value
      .split(/[,;]/)
      .map((email) => email.trim())
      .filter((email) => isValidEmail(email)),
  )];
}

function formatOrderTypeLabel(orderType: string): string {
  const raw = orderType.trim();
  if (!raw) return "Order";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
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

function getTotalDiscount(
  order: Pick<OrderPaymentReceivedRow, "coupon_discount" | "wholesale_discount">,
): number {
  const wholesale = Number(order.wholesale_discount ?? 0);
  const coupon = Number(order.coupon_discount ?? 0);
  const total =
    (Number.isFinite(wholesale) ? Math.max(wholesale, 0) : 0) +
    (Number.isFinite(coupon) ? Math.max(coupon, 0) : 0);
  return total > 0 ? total : 0;
}

function formatTotalDiscount(amount: number): string {
  if (amount <= 0) return formatCurrency(0);
  return `-${formatCurrency(amount)}`;
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

function formatCustomerName(order: OrderPaymentReceivedRow): string {
  return order.customer_name?.trim() || "Customer";
}

function formatShippingType(method: OrderFulfillmentMethod): string {
  return isPickupFulfillment(method) ? "Pickup" : "Delivery";
}

function formatBillingAddress(order: OrderPaymentReceivedRow): string {
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

function formatDeliveryShippingAddress(order: OrderPaymentReceivedRow): string {
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
  order: OrderPaymentReceivedRow,
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

function resolvePickupStoreId(order: OrderPaymentReceivedRow): number | null {
  return order.requested_pick_up_store_id ?? order.store_id;
}

async function fetchOrderPaymentReceivedTemplate(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<EmailTemplateRow | null> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_body, html_extensions")
    .eq("name", ORDER_PAYMENT_RECEIVED_TEMPLATE)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load ${ORDER_PAYMENT_RECEIVED_TEMPLATE} template: ${error.message}`,
    );
  }

  return (data as EmailTemplateRow | null) ?? null;
}

async function fetchOrderForPaymentReceived(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
): Promise<OrderPaymentReceivedRow | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, status, order_type, created_at, customer_name, customer_email, customer_phone, subtotal, coupon_discount, wholesale_discount, tax_total, shipping_fee, grand_total, requested_target_date, requested_fulfillment_method, requested_pick_up_store_id, store_id, shipping_dba_name, shipping_address, shipping_city, shipping_state, shipping_postal_code, shipping_country, billing_legal_name, billing_address, billing_city, billing_state, billing_postal_code, billing_country",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load order #${orderId}: ${error.message}`);
  }

  return (data as OrderPaymentReceivedRow | null) ?? null;
}

async function fetchLatestPaidPayment(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: number,
): Promise<PaidPaymentRow | null> {
  const { data, error } = await supabase
    .from("order_payments")
    .select("created_at")
    .eq("order_id", orderId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load payment for order #${orderId}: ${error.message}`);
  }

  return (data as PaidPaymentRow | null) ?? null;
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

async function fetchOrderItems(
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

export async function sendOrderPaymentReceivedEmail(orderId: number): Promise<void> {
  const supabase = createServiceClient();
  const order = await fetchOrderForPaymentReceived(supabase, orderId);

  if (!order) {
    console.warn(`[order-payment-received] Order #${orderId} not found; skipping email`);
    return;
  }

  const orderType = order.order_type.trim().toLowerCase();
  const adminUrlSettingKey = adminOrderUrlSettingKey(orderType);

  const settings = await fetchSettingsByKeys(supabase, [
    ORDER_NOTIFY_EMAIL_SETTING,
    adminUrlSettingKey,
  ]);

  const recipientEmails = parseRecipientEmails(
    settings[ORDER_NOTIFY_EMAIL_SETTING]?.trim() ?? "",
  );

  if (recipientEmails.length === 0) {
    console.warn(
      `[order-payment-received] Setting ${ORDER_NOTIFY_EMAIL_SETTING} is missing or invalid; skipping`,
    );
    return;
  }

  const adminOrderBaseUrl = settings[adminUrlSettingKey]?.trim() ?? "";
  if (!adminOrderBaseUrl) {
    console.warn(
      `[order-payment-received] Setting ${adminUrlSettingKey} is missing; admin order link will be empty`,
    );
  }

  const pickupStoreId = isPickupFulfillment(order.requested_fulfillment_method)
    ? resolvePickupStoreId(order)
    : null;

  const [items, template, pickupStore, latestPayment] = await Promise.all([
    fetchOrderItems(supabase, orderId),
    fetchOrderPaymentReceivedTemplate(supabase),
    pickupStoreId
      ? fetchPickupStore(supabase, pickupStoreId)
      : Promise.resolve(null),
    fetchLatestPaidPayment(supabase, orderId),
  ]);

  if (!template?.html_body?.trim()) {
    throw new Error(`Email template ${ORDER_PAYMENT_RECEIVED_TEMPLATE} not found`);
  }

  if (!template.html_extensions?.[0]?.trim()) {
    throw new Error(
      `Email template ${ORDER_PAYMENT_RECEIVED_TEMPLATE} is missing extension_1 in html_extensions`,
    );
  }

  const itemRows = buildOrderItemTemplateRows(items);
  const extensionVariables = renderExtensionVariables(
    template.html_extensions,
    itemRows,
  );
  const orderTypeLabel = formatOrderTypeLabel(orderType);
  const templateVariables: Record<string, string | number | boolean> = {
    orderId: `SE-${order.id}`,
    orderType: orderTypeLabel,
    orderCreatedAt: formatOrderDate(order.created_at),
    paymentReceivedAt: formatOrderDate(latestPayment?.created_at ?? new Date().toISOString()),
    customerName: formatCustomerName(order),
    customerEmail: order.customer_email?.trim() ?? "",
    customerPhone: order.customer_phone?.trim() ?? "",
    billingAddress: formatBillingAddress(order),
    shippingAddress: formatShippingAddress(order, pickupStore),
    deliveryBy: formatOrderDate(order.requested_target_date),
    subtotal: formatCurrency(order.subtotal),
    totalDiscount: formatTotalDiscount(getTotalDiscount(order)),
    taxTotal: formatCurrency(order.tax_total),
    shippingFee: formatCurrency(order.shipping_fee),
    grandTotal: formatCurrency(order.grand_total),
    shippingType: formatShippingType(order.requested_fulfillment_method),
    adminOrderUrl: buildAdminOrderUrl(adminOrderBaseUrl, order.id),
    ...extensionVariables,
  };

  await sendEmail({
    senderEmail: DEFAULT_SENDER_EMAIL,
    senderName: DEFAULT_SENDER_NAME,
    recipientEmails,
    templateId: ORDER_PAYMENT_RECEIVED_TEMPLATE,
    templateVarialbles: templateVariables,
  });

  console.log(
    `[order-payment-received] Sent ${ORDER_PAYMENT_RECEIVED_TEMPLATE} for ${orderTypeLabel} order #${orderId} to ${recipientEmails.join(", ")}`,
  );
}
