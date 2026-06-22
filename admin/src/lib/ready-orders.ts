import supabase from '@/lib/supabase/client';
import type { OrderType } from '@/pages/Sales/orderType';
import type { OrderStatus } from '@/pages/Sales/salesOrderShared';

export const DASHBOARD_READY_ORDERS_LIMIT = 10;

export type ReadyOrder = {
  id: number;
  order_type: OrderType;
  customer_name: string;
  customer_email: string;
  requested_target_date: string;
  grand_total: string;
  status: OrderStatus;
  created_at: string;
};

export const READY_ORDER_SELECT =
  'id, order_type, customer_name, customer_email, requested_target_date, grand_total, status, created_at';

export function formatReadyOrderTotal(value: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return `$${amount.toFixed(2)}`;
}

export function readyOrdersRemainingMessage(
  shownCount: number,
  totalCount: number,
): string | null {
  if (totalCount <= shownCount) return null;
  const remaining = totalCount - shownCount;
  return `${remaining} more confirmed ${remaining === 1 ? 'order' : 'orders'} not shown.`;
}

export async function fetchReadyOrders(input: {
  limit: number;
}): Promise<{ items: ReadyOrder[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from('orders')
    .select(READY_ORDER_SELECT, { count: 'exact' })
    .eq('status', 'confirmed')
    .eq('is_testing', false)
    .order('requested_target_date', { ascending: true })
    .limit(input.limit);

  if (error) throw error;

  return {
    items: (data ?? []) as ReadyOrder[],
    totalCount: count ?? 0,
  };
}
