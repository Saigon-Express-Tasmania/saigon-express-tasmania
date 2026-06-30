import type { ItemCustomisation } from '@/lib/order-item-customisation';
import { normalizeAustralianStateForStorage } from '@/lib/australian-states';
import type { OrderType } from './orderType';
import {
  defaultOrderAddressFields,
  emptyB2BForm,
  parseB2BFormFromRow,
  type OrderAddressDbFields,
  type SalesOrderB2BForm,
} from './salesOrderB2b';
import {
  fetchLatestPayment,
  fetchOrderItems,
  mapDbItemToForm,
  ORDER_HEADER_COLUMNS,
} from './salesOrderDb';

export type { SalesOrderB2BForm } from './salesOrderB2b';

export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'preparing'
  | 'packed'
  | 'ready_to_pickup'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type FulfillmentType = 'pick_up' | 'delivery' | 'shipping';

export type PaymentTerms =
  | 'prepaid'
  | 'due_on_receipt'
  | 'deposit_required'
  | 'net_30'
  | 'net_60'
  | 'net_90';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'cash'
  | 'check'
  | 'other';

export type PaymentGateway =
  | 'none'
  | 'stripe'
  | 'square'
  | 'paypal'
  | 'cash'
  | 'check'
  | 'other';

export type ItemUom = 'CASE' | 'EACH' | 'LBS' | 'KG';

export type SalesOrderRow = {
  id: number;
  is_testing: boolean;
  order_type: OrderType;
  customer_account: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  store_id: number | null;
  requested_fulfillment_method: FulfillmentType;
  requested_target_date: string;
  requested_pick_up_store_id: number | null;
  payment_terms: PaymentTerms;
  po_number: string | null;
  subtotal: string;
  coupon_code: string | null;
  coupon_discount: string;
  wholesale_discount: string;
  tax_total: string;
  shipping_fee: string;
  grand_total: string;
  status: OrderStatus;
  notes: string | null;
  cancel_token: string | null;
  tracking_token: string | null;
  status_updated_at: string | null;
  created_at: string;
  payment_status?: PaymentStatus;
} & OrderAddressDbFields;

export type SalesOrderItemRow = {
  id: number;
  order_id: number;
  item_type: string;
  product_id: number | null;
  sku: string;
  name: string;
  quantity: number | string;
  uom: ItemUom;
  unit_price: string;
  line_total: string;
  customisation?: unknown;
};

export type SalesOrderPaymentForm = {
  status: PaymentStatus;
  mode: 'test' | 'live' | null;
  method: PaymentMethod;
  gateway: PaymentGateway;
  gateway_transaction_id: string;
  amount: string;
};

export type SalesOrderForm = Omit<
  SalesOrderRow,
  'id' | 'order_type' | 'created_at' | 'payment_status' | 'is_testing'
> & {
  items: SalesOrderItemForm[];
  b2b: SalesOrderB2BForm;
  payment: SalesOrderPaymentForm;
  created_at?: string | null;
  is_testing?: boolean;
};

export function pickOrderAddressFields(
  source: Pick<SalesOrderForm, keyof OrderAddressDbFields>,
): OrderAddressDbFields {
  return {
    shipping_dba_name: source.shipping_dba_name,
    shipping_special_instructions: source.shipping_special_instructions,
    shipping_preferred_window: source.shipping_preferred_window,
    shipping_address: source.shipping_address,
    shipping_city: source.shipping_city,
    shipping_state: normalizeAustralianStateForStorage(source.shipping_state),
    shipping_postal_code: source.shipping_postal_code,
    shipping_country: source.shipping_country,
    billing_legal_name: source.billing_legal_name,
    billing_tax_id: source.billing_tax_id,
    billing_address: source.billing_address,
    billing_city: source.billing_city,
    billing_state: normalizeAustralianStateForStorage(source.billing_state),
    billing_postal_code: source.billing_postal_code,
    billing_country: source.billing_country,
  };
}

export function orderAddressFromForm(
  form: Pick<SalesOrderForm, keyof OrderAddressDbFields>,
): OrderAddressDbFields {
  return {
    shipping_dba_name: form.shipping_dba_name?.trim() || null,
    shipping_special_instructions: form.shipping_special_instructions?.trim() || null,
    shipping_preferred_window: form.shipping_preferred_window?.trim() || null,
    shipping_address: form.shipping_address.trim() || 'N/A',
    shipping_city: form.shipping_city.trim() || 'N/A',
    shipping_state: normalizeAustralianStateForStorage(form.shipping_state) || 'N/A',
    shipping_postal_code: form.shipping_postal_code.trim() || '0000',
    shipping_country: form.shipping_country.trim() || 'Australia',
    billing_legal_name: form.billing_legal_name?.trim() || null,
    billing_tax_id: form.billing_tax_id?.trim() || null,
    billing_address: form.billing_address.trim() || 'N/A',
    billing_city: form.billing_city.trim() || 'N/A',
    billing_state: normalizeAustralianStateForStorage(form.billing_state) || 'N/A',
    billing_postal_code: form.billing_postal_code.trim() || '0000',
    billing_country: form.billing_country.trim() || 'Australia',
  };
}

export type SalesOrderItemForm = {
  menu_item_id: number;
  sku: string;
  qty: number;
  unit_price: number;
  item_name: string;
  uom: ItemUom;
  customisation?: ItemCustomisation | null;
};

export type SalesOrdersDataset = {
  isTestingFilter: boolean;
  itemsTable: 'order_items';
  pageLabel: string;
  tableDescription: string;
  entityName: string;
  entityNameTitle: string;
  addButtonLabel: string;
  emptyMessage: string;
  formIdPrefix: string;
  defaultPaymentMode: 'test' | 'live' | null;
};

export const SALES_ORDER_COLUMNS = ORDER_HEADER_COLUMNS;

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'awaiting_payment',
  'confirmed',
  'preparing',
  'packed',
  'ready_to_pickup',
  'out_for_delivery',
  'completed',
  'cancelled',
];

export const FULFILLMENT_TYPE_OPTIONS: FulfillmentType[] = [
  'pick_up',
  'delivery',
  'shipping',
];

export const PAYMENT_TERMS_OPTIONS: PaymentTerms[] = [
  'prepaid',
  'due_on_receipt',
  'deposit_required',
  'net_30',
  'net_60',
  'net_90',
];

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ['unpaid', 'paid', 'refunded'];

export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  'credit_card',
  'debit_card',
  'cash',
  'check',
  'other',
];

export const PAYMENT_GATEWAY_OPTIONS: PaymentGateway[] = [
  'none',
  'stripe',
  'square',
  'paypal',
  'cash',
  'check',
  'other',
];

export const ITEM_UOM_OPTIONS: ItemUom[] = ['CASE', 'EACH', 'LBS', 'KG'];

export const LIVE_ORDERS_DATASET: SalesOrdersDataset = {
  isTestingFilter: false,
  itemsTable: 'order_items',
  pageLabel: 'Orders',
  tableDescription: 'Manage confirmed and historical orders.',
  entityName: 'order',
  entityNameTitle: 'Order',
  addButtonLabel: 'Add order',
  emptyMessage: 'No orders found.',
  formIdPrefix: 'order',
  defaultPaymentMode: null,
};

export const TEST_ORDERS_DATASET: SalesOrdersDataset = {
  isTestingFilter: true,
  itemsTable: 'order_items',
  pageLabel: 'Test orders',
  tableDescription: 'Stripe test-mode orders (is_testing = true).',
  entityName: 'test order',
  entityNameTitle: 'Test order',
  addButtonLabel: 'Add test order',
  emptyMessage: 'No test orders found.',
  formIdPrefix: 'test-order',
  defaultPaymentMode: 'test',
};

export function emptyPaymentForm(
  defaultMode: 'test' | 'live' | null = null,
): SalesOrderPaymentForm {
  return {
    status: 'unpaid',
    mode: defaultMode,
    method: 'credit_card',
    gateway: 'none',
    gateway_transaction_id: '',
    amount: '0.00',
  };
}

export function defaultFulfillmentForOrderType(orderType: string): FulfillmentType {
  if (orderType === 'wholesale' || orderType === 'delivery') return 'delivery';
  return 'pick_up';
}

export function emptyOrderForm(
  defaultPaymentMode: 'test' | 'live' | null,
  orderType = 'pickup',
): SalesOrderForm {
  const targetDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    customer_account: null,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    store_id: null,
    requested_fulfillment_method: defaultFulfillmentForOrderType(orderType),
    requested_target_date: targetDate,
    requested_pick_up_store_id: null,
    payment_terms: 'prepaid',
    po_number: null,
    subtotal: '0.00',
    coupon_code: null,
    coupon_discount: '0.00',
    wholesale_discount: '0.00',
    tax_total: '0.00',
    shipping_fee: '0.00',
    grand_total: '0.00',
    status: 'pending',
    notes: null,
    cancel_token: null,
    tracking_token: null,
    status_updated_at: null,
    ...defaultOrderAddressFields(),
    items: [],
    b2b: emptyB2BForm(),
    payment: emptyPaymentForm(defaultPaymentMode),
  };
}

export function syncTotalsFromItems(
  form: SalesOrderForm,
  tax: { isGstInclusive: boolean } = { isGstInclusive: true },
): SalesOrderForm {
  const subtotal = form.items.reduce((sum, item) => {
    const qty = Number(item.qty);
    const unitPrice = Number(item.unit_price);
    if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return sum;
    return sum + qty * unitPrice;
  }, 0);

  const couponDiscount = Number(form.coupon_discount) || 0;
  const wholesaleDiscount = Number(form.wholesale_discount) || 0;
  const shippingFee = Number(form.shipping_fee) || 0;
  const taxTotal = tax.isGstInclusive ? 0 : Number(form.tax_total) || 0;
  const grandTotal =
    subtotal - couponDiscount - wholesaleDiscount + taxTotal + shippingFee;

  return {
    ...form,
    subtotal: subtotal.toFixed(2),
    tax_total: tax.isGstInclusive ? '0.00' : taxTotal.toFixed(2),
    grand_total: Math.max(grandTotal, 0).toFixed(2),
    payment: {
      ...form.payment,
      amount: Math.max(grandTotal, 0).toFixed(2),
    },
  };
}

export function orderToForm(
  order: SalesOrderRow,
  items: SalesOrderItemRow[],
  payment: SalesOrderPaymentForm | null,
  defaultPaymentMode: 'test' | 'live' | null,
): SalesOrderForm {
  const itemPayload: SalesOrderItemForm[] = items.map((item) => mapDbItemToForm(item));

  return {
    customer_account: order.customer_account,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    store_id: order.store_id,
    requested_fulfillment_method: order.requested_fulfillment_method,
    requested_target_date: order.requested_target_date,
    requested_pick_up_store_id: order.requested_pick_up_store_id,
    payment_terms: order.payment_terms,
    po_number: order.po_number,
    subtotal: order.subtotal,
    coupon_code: order.coupon_code,
    coupon_discount: order.coupon_discount,
    wholesale_discount: order.wholesale_discount,
    tax_total: order.tax_total,
    shipping_fee: order.shipping_fee,
    grand_total: order.grand_total,
    status: order.status,
    notes: order.notes,
    cancel_token: order.cancel_token,
    tracking_token: order.tracking_token,
    status_updated_at: order.status_updated_at,
    created_at: order.created_at,
    is_testing: order.is_testing,
    ...pickOrderAddressFields(order),
    items: itemPayload,
    b2b: parseB2BFormFromRow(order),
    payment: payment ?? emptyPaymentForm(defaultPaymentMode),
  };
}

export async function loadOrderForm(
  order: SalesOrderRow,
  defaultPaymentMode: 'test' | 'live' | null,
): Promise<SalesOrderForm> {
  const [items, payment] = await Promise.all([
    fetchOrderItems(order.id),
    fetchLatestPayment(order.id),
  ]);
  return orderToForm(order, items, payment, defaultPaymentMode);
}

export function emptyOrderItem(): SalesOrderItemForm {
  return {
    menu_item_id: 0,
    sku: '',
    qty: 1,
    unit_price: 0,
    item_name: '',
    uom: 'EACH',
  };
}

export function validateOrderItems(items: SalesOrderItemForm[]): SalesOrderItemForm[] {
  if (items.length === 0) {
    throw new Error('At least one line item is required.');
  }

  return items.map((item, index) => {
    const row = index + 1;
    const menu_item_id = Number(item.menu_item_id);
    const qty = Number(item.qty);
    const unit_price = Number(item.unit_price);
    const item_name = String(item.item_name ?? '').trim();
    const sku = String(item.sku ?? item_name).trim();

    if (!Number.isFinite(menu_item_id) || menu_item_id <= 0) {
      throw new Error(`Line ${row}: product ID must be greater than zero.`);
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error(`Line ${row}: quantity must be greater than zero.`);
    }
    if (!Number.isFinite(unit_price) || unit_price < 0) {
      throw new Error(`Line ${row}: unit price must be zero or greater.`);
    }
    if (!item_name) {
      throw new Error(`Line ${row}: item name is required.`);
    }

    return {
      menu_item_id,
      sku: sku || item_name,
      qty,
      unit_price,
      item_name,
      uom: item.uom ?? 'EACH',
      ...(item.customisation ? { customisation: item.customisation } : {}),
    };
  });
}

export function parsePaymentTerms(value: string): PaymentTerms {
  const raw = value.trim().toLowerCase().replace(/\s+/g, '_');
  if ((PAYMENT_TERMS_OPTIONS as readonly string[]).includes(raw)) {
    return raw as PaymentTerms;
  }
  return 'prepaid';
}
