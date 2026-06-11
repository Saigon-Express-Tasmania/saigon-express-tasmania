import {
  emptyB2BForm,
  parseB2BFormFromRow,
  type SalesOrderB2BForm,
} from './salesOrderB2b';

export type { SalesOrderB2BForm } from './salesOrderB2b';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export type SalesOrderRow = {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  store_id: number | null;
  pickup_time: string;
  total: string;
  status: OrderStatus;
  stripe_checkout_session_id: string | null;
  stripe_mode: 'test' | 'live' | null;
  payment_status: PaymentStatus;
  notes: string | null;
  cancel_token: string | null;
  tracking_token: string | null;
  buyer: unknown;
  shipping_address: unknown;
  billing_address: unknown;
  financial_details: unknown;
  status_updated_at: string | null;
  receipt_confirmed_at: string | null;
  created_at: string;
};

export type SalesOrderItemRow = {
  id: number;
  order_id: number;
  menu_item_id: number;
  qty: number;
  unit_price: string;
  item_name: string;
};

export type SalesOrderForm = Omit<
  SalesOrderRow,
  'id' | 'created_at' | 'buyer' | 'shipping_address' | 'billing_address' | 'financial_details'
> & {
  items: SalesOrderItemForm[];
  b2b: SalesOrderB2BForm;
};

export type SalesOrderItemForm = {
  menu_item_id: number;
  qty: number;
  unit_price: number;
  item_name: string;
};

export type SalesOrdersDataset = {
  ordersTable: 'orders' | 'test_orders';
  itemsTable: 'order_items' | 'test_order_items';
  pageLabel: string;
  tableDescription: string;
  entityName: string;
  entityNameTitle: string;
  addButtonLabel: string;
  emptyMessage: string;
  formIdPrefix: string;
  defaultStripeMode: 'test' | 'live' | null;
  archiveOnDelete: boolean;
};

export const SALES_ORDER_COLUMNS =
  'id, customer_name, customer_email, customer_phone, store_id, pickup_time, total, status, stripe_checkout_session_id, stripe_mode, payment_status, notes, cancel_token, tracking_token, buyer, shipping_address, billing_address, financial_details, status_updated_at, receipt_confirmed_at, created_at';

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
];

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ['unpaid', 'paid', 'refunded'];

export const LIVE_ORDERS_DATASET: SalesOrdersDataset = {
  ordersTable: 'orders',
  itemsTable: 'order_items',
  pageLabel: 'Orders',
  tableDescription: 'Manage confirmed and historical orders.',
  entityName: 'order',
  entityNameTitle: 'Order',
  addButtonLabel: 'Add order',
  emptyMessage: 'No orders found.',
  formIdPrefix: 'order',
  defaultStripeMode: null,
  archiveOnDelete: true,
};

export const TEST_ORDERS_DATASET: SalesOrdersDataset = {
  ordersTable: 'test_orders',
  itemsTable: 'test_order_items',
  pageLabel: 'Test orders',
  tableDescription: 'Stripe test-mode orders (separate from live orders).',
  entityName: 'test order',
  entityNameTitle: 'Test order',
  addButtonLabel: 'Add test order',
  emptyMessage: 'No test orders found.',
  formIdPrefix: 'test-order',
  defaultStripeMode: 'test',
  archiveOnDelete: false,
};

export function emptyOrderForm(defaultStripeMode: 'test' | 'live' | null): SalesOrderForm {
  return {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    store_id: null,
    pickup_time: '',
    total: '0.00',
    status: 'pending',
    stripe_checkout_session_id: null,
    stripe_mode: defaultStripeMode,
    payment_status: 'unpaid',
    notes: null,
    cancel_token: null,
    tracking_token: null,
    status_updated_at: null,
    receipt_confirmed_at: null,
    items: [],
    b2b: emptyB2BForm(),
  };
}

export function orderToForm(
  order: SalesOrderRow,
  items: SalesOrderItemRow[],
): SalesOrderForm {
  const itemPayload: SalesOrderItemForm[] = items.map((item) => ({
    menu_item_id: item.menu_item_id,
    qty: item.qty,
    unit_price: Number(item.unit_price),
    item_name: item.item_name,
  }));

  return {
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    store_id: order.store_id,
    pickup_time: order.pickup_time,
    total: order.total,
    status: order.status,
    stripe_checkout_session_id: order.stripe_checkout_session_id,
    stripe_mode: order.stripe_mode,
    payment_status: order.payment_status,
    notes: order.notes,
    cancel_token: order.cancel_token,
    tracking_token: order.tracking_token,
    status_updated_at: order.status_updated_at,
    receipt_confirmed_at: order.receipt_confirmed_at,
    items: itemPayload,
    b2b: parseB2BFormFromRow(order),
  };
}

export function emptyOrderItem(): SalesOrderItemForm {
  return {
    menu_item_id: 0,
    qty: 1,
    unit_price: 0,
    item_name: '',
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

    if (!Number.isFinite(menu_item_id) || menu_item_id <= 0) {
      throw new Error(`Line ${row}: menu item ID must be greater than zero.`);
    }
    if (!Number.isFinite(qty) || qty < 1) {
      throw new Error(`Line ${row}: quantity must be at least 1.`);
    }
    if (!Number.isFinite(unit_price) || unit_price < 0) {
      throw new Error(`Line ${row}: unit price must be zero or greater.`);
    }
    if (!item_name) {
      throw new Error(`Line ${row}: item name is required.`);
    }

    return { menu_item_id, qty, unit_price, item_name };
  });
}
