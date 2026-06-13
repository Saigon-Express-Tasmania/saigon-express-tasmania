import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_LOCALE } from "@/config/localize";
import {
  getOrderStatusLabel,
  getOrderTimelineIndex,
  ORDER_TRACKING_TIMELINE_LENGTH,
  isOrderPacked,
  type OrderStatus,
} from "@/lib/order-status";
import {
  extractOrderFlatAddress,
  parseWholesaleOrderB2B,
  type OrderFlatAddress,
} from "@/lib/wholesale-b2b-order";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { formatRequestedTargetDate } from "@/lib/supabase/wholesale-orders";
import {
  normalizeWholesaleImageUrls,
  pickWholesaleImageUrl,
  type WholesaleImageUrls,
} from "@/types/WholesaleProduct";
import type { WholesaleOrderB2B } from "@/types/WholesaleB2BOrder";

export const ORDER_TRACKING_NOT_FOUND_ERROR = "not_found";
export const ORDER_TRACKING_TOKEN_GROUP_SIZE = 4;
export const ORDER_TRACKING_TOKEN_LENGTH = 12;
/** Legacy tokens from randomHex(24) before Crockford base32 migration. */
export const LEGACY_TRACKING_TOKEN_HEX_LENGTH = 48;

const HEX_CHARS_ONLY = /^[0-9a-fA-F]+$/;

function isLegacyTrackingToken(value: string): boolean {
  return (
    value.length > ORDER_TRACKING_TOKEN_LENGTH &&
    HEX_CHARS_ONLY.test(value)
  );
}

export function normalizeTrackingTokenInput(value: string): string {
  const stripped = value.replace(/[^0-9a-z]/gi, "");
  if (!stripped) return "";

  if (isLegacyTrackingToken(stripped)) {
    return stripped.toLowerCase();
  }

  return stripped.toUpperCase();
}

export function formatTrackingTokenInput(value: string): string {
  const normalized = normalizeTrackingTokenInput(value);
  if (!normalized) return "";

  const parts: string[] = [];
  for (let i = 0; i < normalized.length; i += ORDER_TRACKING_TOKEN_GROUP_SIZE) {
    parts.push(normalized.slice(i, i + ORDER_TRACKING_TOKEN_GROUP_SIZE));
  }
  return parts.join("-");
}

export type TrackedOrderItem = {
  id: number;
  menu_item_id: number;
  sku: string;
  qty: number;
  unit_price: number;
  line_total: number;
  item_name: string;
  imageUrl: string | null;
};

export type TrackedOrder = {
  id: number;
  order_type: string;
  customer_name: string;
  subtotal: number;
  tax_total: number;
  shipping_fee: number;
  grand_total: number;
  /** @deprecated Use grand_total */
  total: number;
  status: OrderStatus;
  requested_target_date: string | null;
  /** Formatted fulfillment target for display */
  pickup_time: string;
  requested_fulfillment_method: string | null;
  requested_pick_up_store_id: number | null;
  store_id: number | null;
  created_at: string;
  status_updated_at: string | null;
  notes: string | null;
  items: TrackedOrderItem[];
  address: OrderFlatAddress;
  b2b: WholesaleOrderB2B;
};

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return url;
}

function getSupabaseKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  }
  return key;
}

function createTrackingSupabaseClient(trackingToken: string): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        "x-tracking-token": trackingToken,
      },
    },
  });
}

function isTestingOrders(): boolean {
  return getClientStripeMode() === "test";
}

const TRACKED_ORDER_SELECT =
  "id, order_type, customer_name, customer_email, customer_phone, subtotal, tax_total, shipping_fee, grand_total, status, requested_target_date, requested_fulfillment_method, requested_pick_up_store_id, store_id, created_at, status_updated_at, notes, shipping_dba_name, shipping_special_instructions, shipping_preferred_window, shipping_address, shipping_city, shipping_state, shipping_postal_code, shipping_country, billing_legal_name, billing_tax_id, billing_address, billing_city, billing_state, billing_postal_code, billing_country, payment_terms";

function buildTrackedOrderB2B(row: Record<string, unknown>): WholesaleOrderB2B {
  const b2b = parseWholesaleOrderB2B(row);

  if (b2b.buyer) return b2b;

  const name = String(row.customer_name ?? "").trim();
  if (!name) return b2b;

  return {
    ...b2b,
    buyer: {
      name,
      contact_phone: String(row.customer_phone ?? ""),
      contact_email: String(row.customer_email ?? "") || null,
    },
  };
}

function mapTrackedOrderItem(
  item: Record<string, unknown>,
  productImages: Map<number, WholesaleImageUrls>,
): TrackedOrderItem {
  const qty = Number(item.quantity ?? item.qty ?? 0);
  const unitPrice = Number(item.unit_price ?? 0);
  const productId = Number(item.product_id ?? 0);

  return {
    id: Number(item.id),
    menu_item_id: productId,
    sku: String(item.sku ?? item.name ?? item.item_name ?? ""),
    qty,
    unit_price: unitPrice,
    line_total: Number(item.line_total ?? qty * unitPrice),
    item_name: String(item.name ?? item.item_name ?? ""),
    imageUrl:
      productId > 0
        ? pickWholesaleImageUrl(productImages.get(productId), [512, 256, 1448])
        : null,
  };
}

async function fetchProductImageMap(
  supabase: SupabaseClient,
  productIds: number[],
): Promise<Map<number, WholesaleImageUrls>> {
  const uniqueIds = [...new Set(productIds.filter((id) => id > 0))];
  const imageMap = new Map<number, WholesaleImageUrls>();
  if (uniqueIds.length === 0) {
    return imageMap;
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, image_urls")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(`products: ${error.message}`);
  }

  for (const row of data ?? []) {
    imageMap.set(
      Number(row.id),
      normalizeWholesaleImageUrls(
        (row as { image_urls?: unknown }).image_urls,
      ),
    );
  }

  return imageMap;
}

function mapTrackedOrderRow(
  row: Record<string, unknown>,
  rawItems: Record<string, unknown>[],
  productImages: Map<number, WholesaleImageUrls>,
): TrackedOrder {
  const requestedTargetDate = (row.requested_target_date as string | null) ?? null;
  const grandTotal = Number(row.grand_total ?? row.total ?? 0);

  return {
    id: Number(row.id),
    order_type: String(row.order_type ?? "pickup"),
    customer_name: String(row.customer_name ?? ""),
    subtotal: Number(row.subtotal ?? 0),
    tax_total: Number(row.tax_total ?? 0),
    shipping_fee: Number(row.shipping_fee ?? 0),
    grand_total: grandTotal,
    total: grandTotal,
    status: row.status as OrderStatus,
    requested_target_date: requestedTargetDate,
    pickup_time: formatRequestedTargetDate(requestedTargetDate),
    requested_fulfillment_method:
      (row.requested_fulfillment_method as string | null) ?? null,
    requested_pick_up_store_id:
      row.requested_pick_up_store_id == null
        ? null
        : Number(row.requested_pick_up_store_id),
    store_id: row.store_id == null ? null : Number(row.store_id),
    created_at: String(row.created_at),
    status_updated_at:
      row.status_updated_at == null ? null : String(row.status_updated_at),
    notes: row.notes == null ? null : String(row.notes),
    items: rawItems.map((item) => mapTrackedOrderItem(item, productImages)),
    address: extractOrderFlatAddress(row),
    b2b: buildTrackedOrderB2B(row),
  };
}

async function fetchTrackedOrderForMode(
  trackingToken: string,
  isTesting: boolean,
): Promise<TrackedOrder | null> {
  const supabase = createTrackingSupabaseClient(trackingToken);

  const { data, error } = await supabase
    .from("orders")
    .select(TRACKED_ORDER_SELECT)
    .eq("tracking_token", trackingToken)
    .eq("is_testing", isTesting)
    .maybeSingle();

  if (error) {
    throw new Error(`orders: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const orderRow = data as Record<string, unknown>;
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      "id, product_id, sku, quantity, unit_price, line_total, name",
    )
    .eq("order_id", Number(orderRow.id));

  if (itemsError) {
    throw new Error(`order_items: ${itemsError.message}`);
  }

  const rawItems = (items ?? []) as Record<string, unknown>[];
  const productIds = rawItems.map((item) => Number(item.product_id ?? 0));
  const productImages = await fetchProductImageMap(supabase, productIds);

  return mapTrackedOrderRow(orderRow, rawItems, productImages);
}

export async function fetchOrderByTrackingToken(
  trackingToken: string,
): Promise<TrackedOrder | null> {
  const trimmed = trackingToken.trim();
  if (!trimmed) {
    return null;
  }

  const primaryIsTesting = isTestingOrders();
  const primary = await fetchTrackedOrderForMode(trimmed, primaryIsTesting);
  if (primary) {
    return primary;
  }

  return fetchTrackedOrderForMode(trimmed, !primaryIsTesting);
}

export function parseTrackingTokenFromParam(token: string): string {
  try {
    return normalizeTrackingTokenInput(decodeURIComponent(token));
  } catch {
    return "";
  }
}

export function getOrderTrackingEntryPath(locale?: string): string {
  if (locale && locale !== DEFAULT_LOCALE) {
    return `/${locale}/order-tracking`;
  }
  return "/order-tracking";
}

export function getOrderTrackingNotFoundRedirect(locale?: string): string {
  return `${getOrderTrackingEntryPath(locale)}?error=${ORDER_TRACKING_NOT_FOUND_ERROR}`;
}

export function formatTrackedOrderId(orderId: number): string {
  return `SE-${orderId}`;
}

export function formatTrackedCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

export function formatTrackedDate(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatTrackedDateLong(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export type TimelineStepState = "completed" | "in_progress" | "upcoming";

export type OrderTimelineStep = {
  key: string;
  label: string;
  state: TimelineStepState;
  dateLabel: string | null;
  notice: string | null;
};

export function isPickupFulfillment(order: TrackedOrder): boolean {
  const method = order.requested_fulfillment_method?.trim().toLowerCase();
  if (method === "pick_up") return true;
  if (method === "delivery" || method === "shipping") return false;
  return order.order_type === "pickup";
}

export function resolveTrackedOrderPickupStoreId(order: TrackedOrder): number | null {
  const pickupStoreId = order.requested_pick_up_store_id;
  if (pickupStoreId != null && pickupStoreId > 0) {
    return pickupStoreId;
  }
  if (
    isPickupFulfillment(order) &&
    order.store_id != null &&
    order.store_id > 0
  ) {
    return order.store_id;
  }
  return null;
}

export function buildOrderTimeline(
  order: TrackedOrder,
  labels: {
    confirmed: string;
    preparing: string;
    packed: string;
    readyToPickup: string;
    outForDelivery: string;
    completed: string;
    confirmedNotice: string;
    preparingNotice: string;
    packedNoticePickup: string;
    packedNoticeDelivery: string;
    pickupNotice: string;
    deliveryNotice: string;
    completedNotice: string;
  },
): OrderTimelineStep[] {
  const isPickup = isPickupFulfillment(order);
  const eventDate = order.status_updated_at ?? order.created_at;
  const dateLabel = formatTrackedDateLong(eventDate);
  const currentIndex = getOrderTimelineIndex(order.status);

  const steps = [
    {
      key: "confirmed",
      label: labels.confirmed,
      notice: labels.confirmedNotice,
    },
    {
      key: "preparing",
      label: labels.preparing,
      notice: labels.preparingNotice,
    },
    {
      key: "packed",
      label: labels.packed,
      notice: isPickup ? labels.packedNoticePickup : labels.packedNoticeDelivery,
    },
    isPickup
      ? {
          key: "ready_to_pickup",
          label: labels.readyToPickup,
          notice: labels.pickupNotice,
        }
      : {
          key: "out_for_delivery",
          label: labels.outForDelivery,
          notice: labels.deliveryNotice,
        },
    {
      key: "completed",
      label: labels.completed,
      notice: labels.completedNotice,
    },
  ];

  return steps.map((step, index) => {
    let state: TimelineStepState = "upcoming";
    if (
      order.status === "completed" ||
      currentIndex >= ORDER_TRACKING_TIMELINE_LENGTH
    ) {
      state = "completed";
    } else if (order.status === "cancelled") {
      state = index === 0 ? "completed" : "upcoming";
    } else if (index < currentIndex) {
      state = "completed";
    } else if (index === currentIndex) {
      state = "in_progress";
    }

    return {
      ...step,
      state,
      dateLabel: state === "upcoming" ? null : dateLabel,
    };
  });
}

export function getCurrentTimelineNotice(
  timeline: OrderTimelineStep[],
  status: string,
): string | null {
  if (status === "cancelled") {
    return null;
  }

  if (status === "completed") {
    return timeline.find((step) => step.key === "completed")?.notice ?? null;
  }

  return timeline.find((step) => step.state === "in_progress")?.notice ?? null;
}

export function timelineNoticeRequiresAction(stepKey: string): boolean {
  return stepKey === "ready_to_pickup" || stepKey === "out_for_delivery";
}

export function getActiveTimelineStep(
  timeline: OrderTimelineStep[],
  status: string,
): OrderTimelineStep | null {
  if (status === "completed") {
    return timeline.find((step) => step.key === "completed") ?? null;
  }

  return timeline.find((step) => step.state === "in_progress") ?? null;
}

export function getExpectedDeliveryLabel(order: TrackedOrder): string | null {
  const preferredWindow = order.b2b.shippingAddress?.preferred_window?.trim();
  if (preferredWindow) {
    return preferredWindow;
  }

  const targetDate = order.pickup_time.trim();
  return targetDate || null;
}

export function isItemPacked(orderStatus: OrderStatus): boolean {
  return isOrderPacked(orderStatus);
}

export { getOrderStatusLabel };
