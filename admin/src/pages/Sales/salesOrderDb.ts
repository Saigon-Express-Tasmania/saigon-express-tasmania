import supabase from '@/lib/supabase/client';
import type { OrderType } from './orderType';
import type {
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  SalesOrderItemForm,
  SalesOrderItemRow,
  SalesOrderPaymentForm,
} from './salesOrderShared';

export const ORDER_HEADER_COLUMNS =
  'id, is_testing, customer_name, customer_email, customer_phone, store_id, requested_fulfillment_method, requested_target_date, requested_pick_up_store_id, payment_terms, po_number, subtotal, tax_total, shipping_fee, grand_total, status, notes, cancel_token, tracking_token, shipping_address, shipping_city, shipping_state, shipping_postal_code, shipping_country, billing_address, billing_city, billing_state, billing_postal_code, billing_country, status_updated_at, created_at';

export const DRAFT_ORDER_COLUMNS = `${ORDER_HEADER_COLUMNS}, expires_at, updated_at`;

export const ARCHIVED_ORDER_COLUMNS = `${ORDER_HEADER_COLUMNS}, archived_reason, archived_at, updated_at`;

export const ORDER_ITEM_SELECT =
  'id, order_id, item_type, product_id, sku, name, quantity, uom, unit_price, line_total';

export const ORDER_PAYMENT_SELECT =
  'id, order_id, amount, status, mode, method, gateway, gateway_transaction_id, notes';

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatTargetDateDisplay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export function mapDbItemToForm(row: SalesOrderItemRow): SalesOrderItemForm {
  const productId = Number(row.product_id ?? 0);
  return {
    menu_item_id: productId,
    sku: row.sku,
    qty: Number(row.quantity),
    unit_price: Number(row.unit_price),
    item_name: row.name,
    uom: row.uom,
  };
}

export function buildOrderItemInsertRows(
  orderId: number,
  orderType: OrderType,
  items: SalesOrderItemForm[],
) {
  return items.map((item) => {
    const lineTotal = item.qty * item.unit_price;
    return {
      order_id: orderId,
      item_type: orderType,
      product_id: item.menu_item_id,
      sku: item.sku.trim() || item.item_name.trim(),
      name: item.item_name.trim(),
      quantity: item.qty,
      uom: item.uom,
      is_catch_weight: false,
      unit_price: item.unit_price.toFixed(2),
      line_total: lineTotal.toFixed(2),
    };
  });
}

export async function fetchOrderItems(orderId: number): Promise<SalesOrderItemRow[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select(ORDER_ITEM_SELECT)
    .eq('order_id', orderId)
    .order('id', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SalesOrderItemRow[];
}

export async function replaceOrderItems(
  orderId: number,
  orderType: OrderType,
  items: SalesOrderItemForm[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId);
  if (deleteError) throw deleteError;

  if (items.length === 0) return;

  const { error: insertError } = await supabase
    .from('order_items')
    .insert(buildOrderItemInsertRows(orderId, orderType, items));
  if (insertError) throw insertError;
}

export async function fetchLatestPayment(
  orderId: number,
): Promise<SalesOrderPaymentForm | null> {
  const { data, error } = await supabase
    .from('order_payments')
    .select(ORDER_PAYMENT_SELECT)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    status: String(row.status ?? 'unpaid') as PaymentStatus,
    mode: (row.mode as 'test' | 'live' | null) ?? null,
    method: String(row.method ?? 'other') as PaymentMethod,
    gateway: String(row.gateway ?? 'none') as PaymentGateway,
    gateway_transaction_id: String(row.gateway_transaction_id ?? ''),
    amount: String(row.amount ?? '0.00'),
  };
}

export async function fetchPaymentStatusByOrderIds(
  orderIds: number[],
): Promise<Map<number, PaymentStatus>> {
  const map = new Map<number, PaymentStatus>();
  if (orderIds.length === 0) return map;

  const { data, error } = await supabase
    .from('order_payments')
    .select('order_id, status, created_at')
    .in('order_id', orderIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const orderId = Number(record.order_id);
    if (!map.has(orderId)) {
      map.set(orderId, String(record.status ?? 'unpaid') as PaymentStatus);
    }
  }

  return map;
}

export async function saveOrderPayment(
  orderId: number,
  payment: SalesOrderPaymentForm,
): Promise<void> {
  const payload = {
    order_id: orderId,
    amount: Number(payment.amount).toFixed(2),
    status: payment.status,
    mode: payment.mode,
    method: payment.method,
    gateway: payment.gateway,
    gateway_transaction_id: payment.gateway_transaction_id.trim(),
    notes: '',
  };

  const { data: existing, error: fetchError } = await supabase
    .from('order_payments')
    .select('id')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing?.id) {
    const { error } = await supabase
      .from('order_payments')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('order_payments').insert(payload);
  if (error) throw error;
}
