import { parseWholesaleOrderB2B } from "@/lib/wholesale-b2b-order";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { supabase } from "@/lib/supabase/client";
import type { WholesaleOrderB2B } from "@/types/WholesaleB2BOrder";

export const WHOLESALE_ORDERS_PAGE_SIZE = 40;

export type WholesaleOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type WholesaleOrderItem = {
  id: number;
  menu_item_id: number;
  qty: number;
  unit_price: number;
  item_name: string;
};

export type WholesaleOrder = {
  id: number;
  order_type: string;
  total: number;
  status: WholesaleOrderStatus;
  payment_status: string;
  tracking_token: string | null;
  created_at: string;
  items: WholesaleOrderItem[];
  b2b: WholesaleOrderB2B;
};

export type WholesaleOrderStatusFilter = WholesaleOrderStatus | "all";

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

function getOrdersTable(): "orders" | "test_orders" {
  return getClientStripeMode() === "test" ? "test_orders" : "orders";
}

function getItemsRelation(): "order_items" | "test_order_items" {
  return getClientStripeMode() === "test" ? "test_order_items" : "order_items";
}

function mapOrderRow(
  row: Record<string, unknown>,
  itemsKey: string,
): WholesaleOrder {
  const rawItems = (row[itemsKey] as Record<string, unknown>[] | null) ?? [];

  return {
    id: Number(row.id),
    order_type: String(row.order_type ?? "wholesale"),
    total: Number(row.total ?? 0),
    status: row.status as WholesaleOrderStatus,
    payment_status: String(row.payment_status ?? "unpaid"),
    tracking_token: (row.tracking_token as string | null) ?? null,
    created_at: String(row.created_at),
    items: rawItems.map((item) => ({
      id: Number(item.id),
      menu_item_id: Number(item.menu_item_id),
      qty: Number(item.qty),
      unit_price: Number(item.unit_price),
      item_name: String(item.item_name),
    })),
    b2b: parseWholesaleOrderB2B({
      buyer: row.buyer,
      shipping_address: row.shipping_address,
      billing_address: row.billing_address,
      financial_details: row.financial_details,
    }),
  };
}

export async function fetchWholesaleOrders(
  params: FetchWholesaleOrdersParams,
): Promise<FetchWholesaleOrdersResult> {
  const table = getOrdersTable();
  const itemsRelation = getItemsRelation();
  const from = (params.page - 1) * WHOLESALE_ORDERS_PAGE_SIZE;
  const to = from + WHOLESALE_ORDERS_PAGE_SIZE - 1;

  let query = supabase
    .from(table)
    .select(
      `id, order_type, total, status, payment_status, tracking_token, created_at, buyer, shipping_address, billing_address, financial_details, ${itemsRelation} (id, menu_item_id, qty, unit_price, item_name)`,
      { count: "exact" },
    )
    .eq("customer_account", params.userId)
    .eq("order_type", "wholesale")
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

  return {
    orders: (data ?? []).map((row) =>
      mapOrderRow(row as Record<string, unknown>, itemsRelation),
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

export function getOrderItemCount(items: WholesaleOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function getOrderTypeLabel(orderType: string): string {
  if (orderType === "wholesale") return "Wholesale";
  return orderType.charAt(0).toUpperCase() + orderType.slice(1);
}
