import {
  extractOrderFlatAddress,
  parseWholesaleOrderB2B,
  type OrderFlatAddress,
} from "@/lib/wholesale-b2b-order";
import type { OrderStatus, OrderStatusFilter } from "@/lib/order-status";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { supabase } from "@/lib/supabase/client";
import type { WholesaleOrderB2B } from "@/types/WholesaleB2BOrder";

export const WHOLESALE_ORDERS_PAGE_SIZE = 40;

export type WholesaleOrderStatus = OrderStatus;
export type WholesaleOrderStatusFilter = OrderStatusFilter;

export type WholesaleOrderItem = {
  id: number;
  menu_item_id: number;
  sku: string;
  qty: number;
  unit_price: number;
  line_total: number;
  item_name: string;
};

export type WholesalePickupStore = {
  id: number;
  name: string;
  address: string;
  suburb: string | null;
  phone: string | null;
  hours: string | null;
};

export type WholesaleOrder = {
  id: number;
  order_type: string;
  subtotal: number;
  tax_total: number;
  shipping_fee: number;
  grand_total: number;
  /** @deprecated Use grand_total */
  total: number;
  status: WholesaleOrderStatus;
  payment_status: string;
  tracking_token: string | null;
  requested_target_date: string | null;
  requested_fulfillment_method: string | null;
  requested_pick_up_store_id: number | null;
  pickup_store: WholesalePickupStore | null;
  created_at: string;
  items: WholesaleOrderItem[];
  address: OrderFlatAddress;
  b2b: WholesaleOrderB2B;
};

export type FetchWholesaleOrdersParams = {
  userId: string;
  page: number;
  status?: WholesaleOrderStatusFilter;
  dateFrom?: string;
  dateTo?: string;
};

export type FetchWholesaleOrdersResult = {
  orders: WholesaleOrder[];
  totalCount: number;
};

const ORDER_HEADER_SELECT =
  "id, order_type, subtotal, tax_total, shipping_fee, grand_total, status, tracking_token, requested_target_date, requested_fulfillment_method, requested_pick_up_store_id, customer_name, customer_email, customer_phone, shipping_dba_name, shipping_special_instructions, shipping_preferred_window, shipping_address, shipping_city, shipping_state, shipping_postal_code, shipping_country, billing_legal_name, billing_tax_id, billing_address, billing_city, billing_state, billing_postal_code, billing_country, payment_terms, created_at";

function isTestingOrders(): boolean {
  return getClientStripeMode() === "test";
}

function buildWholesaleOrderB2B(row: Record<string, unknown>): WholesaleOrderB2B {
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

function mapOrderItem(item: Record<string, unknown>): WholesaleOrderItem {
  const qty = Number(item.quantity ?? item.qty ?? 0);
  const unitPrice = Number(item.unit_price ?? 0);
  const lineTotal = Number(item.line_total ?? qty * unitPrice);

  return {
    id: Number(item.id),
    menu_item_id: Number(item.product_id ?? 0),
    sku: String(item.sku ?? item.name ?? item.item_name ?? ""),
    qty,
    unit_price: unitPrice,
    line_total: lineTotal,
    item_name: String(item.name ?? item.item_name ?? ""),
  };
}

function mapOrderRow(
  row: Record<string, unknown>,
  itemsByOrderId: Map<number, Record<string, unknown>[]>,
  paymentStatusByOrderId: Map<number, string>,
  storesById: Map<number, WholesalePickupStore>,
): WholesaleOrder {
  const orderId = Number(row.id);
  const grandTotal = Number(row.grand_total ?? row.total ?? 0);
  const pickupStoreId =
    row.requested_pick_up_store_id == null
      ? null
      : Number(row.requested_pick_up_store_id);

  return {
    id: orderId,
    order_type: String(row.order_type ?? "wholesale"),
    subtotal: Number(row.subtotal ?? 0),
    tax_total: Number(row.tax_total ?? 0),
    shipping_fee: Number(row.shipping_fee ?? 0),
    grand_total: grandTotal,
    total: grandTotal,
    status: row.status as WholesaleOrderStatus,
    payment_status: paymentStatusByOrderId.get(orderId) ?? "unpaid",
    tracking_token: (row.tracking_token as string | null) ?? null,
    requested_target_date: (row.requested_target_date as string | null) ?? null,
    requested_fulfillment_method:
      (row.requested_fulfillment_method as string | null) ?? null,
    requested_pick_up_store_id:
      pickupStoreId != null && Number.isFinite(pickupStoreId) && pickupStoreId > 0
        ? pickupStoreId
        : null,
    pickup_store:
      pickupStoreId != null && pickupStoreId > 0
        ? storesById.get(pickupStoreId) ?? null
        : null,
    created_at: String(row.created_at),
    items: (itemsByOrderId.get(orderId) ?? []).map((item) => mapOrderItem(item)),
    address: extractOrderFlatAddress(row),
    b2b: buildWholesaleOrderB2B(row),
  };
}

async function fetchStoreLocationsById(): Promise<Map<number, WholesalePickupStore>> {
  const { data, error } = await supabase
    .from("store_locations")
    .select("id, name, address, suburb, phone, hours")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const storesById = new Map<number, WholesalePickupStore>();
  for (const row of data ?? []) {
    const store = row as WholesalePickupStore;
    storesById.set(Number(store.id), store);
  }
  return storesById;
}

async function fetchPaymentStatusByOrderId(
  orderIds: number[],
): Promise<Map<number, string>> {
  const paymentStatusByOrderId = new Map<number, string>();
  if (orderIds.length === 0) return paymentStatusByOrderId;

  const { data, error } = await supabase
    .from("order_payments")
    .select("order_id, status, created_at")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const orderId = Number((row as Record<string, unknown>).order_id);
    if (!paymentStatusByOrderId.has(orderId)) {
      paymentStatusByOrderId.set(
        orderId,
        String((row as Record<string, unknown>).status ?? "unpaid"),
      );
    }
  }

  return paymentStatusByOrderId;
}

export async function fetchWholesaleOrders(
  params: FetchWholesaleOrdersParams,
): Promise<FetchWholesaleOrdersResult> {
  const from = (params.page - 1) * WHOLESALE_ORDERS_PAGE_SIZE;
  const to = from + WHOLESALE_ORDERS_PAGE_SIZE - 1;

  let query = supabase
    .from("orders")
    .select(ORDER_HEADER_SELECT, { count: "exact" })
    .eq("customer_account", params.userId)
    .eq("order_type", "wholesale")
    .eq("is_testing", isTestingOrders())
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.dateFrom) {
    query = query.gte("created_at", `${params.dateFrom}T00:00:00.000Z`);
  }
  if (params.dateTo) {
    query = query.lte("created_at", `${params.dateTo}T23:59:59.999Z`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const orderRows = (data ?? []) as Record<string, unknown>[];
  const orderIds = orderRows.map((row) => Number(row.id)).filter((id) => id > 0);
  const itemsByOrderId = new Map<number, Record<string, unknown>[]>();
  const storesById = await fetchStoreLocationsById();

  if (orderIds.length > 0) {
    const [{ data: items, error: itemsError }, paymentStatusByOrderId] =
      await Promise.all([
        supabase
          .from("order_items")
          .select(
            "id, order_id, product_id, sku, quantity, unit_price, line_total, name",
          )
          .in("order_id", orderIds),
        fetchPaymentStatusByOrderId(orderIds),
      ]);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    for (const item of (items ?? []) as Record<string, unknown>[]) {
      const orderId = Number(item.order_id);
      const bucket = itemsByOrderId.get(orderId) ?? [];
      bucket.push(item);
      itemsByOrderId.set(orderId, bucket);
    }

    return {
      orders: orderRows.map((row) =>
        mapOrderRow(row, itemsByOrderId, paymentStatusByOrderId, storesById),
      ),
      totalCount: count ?? 0,
    };
  }

  return {
    orders: orderRows.map((row) =>
      mapOrderRow(row, itemsByOrderId, new Map(), storesById),
    ),
    totalCount: count ?? 0,
  };
}

export function formatWholesaleOrderId(orderId: number): string {
  return `SE-${orderId}`;
}

export function formatOrderDate(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatOrderDateShort(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatRequestedTargetDate(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function getOrderItemCount(items: WholesaleOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function getOrderTypeLabel(orderType: string): string {
  if (orderType === "wholesale") return "Wholesale";
  if (orderType === "pickup") return "Pickup";
  if (orderType === "delivery") return "Delivery";
  if (orderType === "catering") return "Catering";
  return orderType.charAt(0).toUpperCase() + orderType.slice(1);
}

export function isWholesalePickupOrder(
  order: Pick<WholesaleOrder, "requested_fulfillment_method">,
): boolean {
  return order.requested_fulfillment_method === "pick_up";
}

export function formatWholesalePickupStoreSummary(
  store: WholesalePickupStore | null,
  storeId: number | null,
): string | null {
  if (store) {
    const locality = [store.address, store.suburb].filter(Boolean).join(", ");
    return locality ? `${store.name} · ${locality}` : store.name;
  }
  if (storeId != null && storeId > 0) {
    return `Pickup store #${storeId}`;
  }
  return null;
}
