export type OrderType = 'delivery' | 'pickup' | 'catering' | 'wholesale';

export const ORDER_TYPES: OrderType[] = ['pickup', 'delivery', 'catering', 'wholesale'];

export const DEFAULT_ORDER_TYPE: OrderType = 'pickup';

export function isOrderType(value: string | undefined): value is OrderType {
  return ORDER_TYPES.includes(value as OrderType);
}

export function formatOrderTypeLabel(orderType: OrderType): string {
  return orderType.charAt(0).toUpperCase() + orderType.slice(1);
}

export function salesPagePath(
  page: 'orders' | 'test-orders' | 'draft-orders' | 'archived-orders',
  orderType: OrderType,
): string {
  return `/sales/${page}/${orderType}`;
}
