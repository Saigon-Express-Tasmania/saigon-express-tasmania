import supabase from '@/lib/supabase/client';
import type { OrderStatus } from '@/pages/Sales/salesOrderShared';

export const DASHBOARD_PENDING_CATERING_ORDERS_LIMIT = 10;

export type PendingCateringOrder = {
  id: number;
  customer_name: string;
  customer_email: string;
  requested_target_date: string;
  grand_total: string;
  status: OrderStatus;
  created_at: string;
};

export const PENDING_CATERING_ORDER_SELECT =
  'id, customer_name, customer_email, requested_target_date, grand_total, status, created_at';

export function formatPendingCateringOrderDate(value: string): string {
  return new Date(value).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatPendingCateringOrderTotal(value: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return `$${amount.toFixed(2)}`;
}

export function pendingCateringOrdersRemainingMessage(
  shownCount: number,
  totalCount: number,
): string | null {
  if (totalCount <= shownCount) return null;
  const remaining = totalCount - shownCount;
  return `${remaining} more pending ${remaining === 1 ? 'order' : 'orders'} not shown.`;
}

export async function fetchPendingCateringOrders(input: {
  limit: number;
}): Promise<{ items: PendingCateringOrder[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from('orders')
    .select(PENDING_CATERING_ORDER_SELECT, { count: 'exact' })
    .eq('order_type', 'catering')
    .eq('status', 'pending')
    .eq('is_testing', false)
    .order('created_at', { ascending: false })
    .limit(input.limit);

  if (error) throw error;

  return {
    items: (data ?? []) as PendingCateringOrder[],
    totalCount: count ?? 0,
  };
}
