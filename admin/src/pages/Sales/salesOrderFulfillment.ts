import type { FulfillmentType, OrderStatus } from './salesOrderShared';

export const PICKUP_FULFILLMENT_STATUSES: OrderStatus[] = [
  'pending',
  'awaiting_payment',
  'confirmed',
  'preparing',
  'packed',
  'ready_to_pickup',
  'completed',
];

export const SHIPPING_FULFILLMENT_STATUSES: OrderStatus[] = [
  'pending',
  'awaiting_payment',
  'confirmed',
  'preparing',
  'packed',
  'out_for_delivery',
  'completed',
];

export function getFulfillmentWorkflow(
  fulfillmentMethod: FulfillmentType,
): OrderStatus[] {
  if (fulfillmentMethod === 'pick_up') {
    return PICKUP_FULFILLMENT_STATUSES;
  }
  return SHIPPING_FULFILLMENT_STATUSES;
}

export function formatOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'awaiting_payment':
      return 'Awaiting payment';
    case 'ready_to_pickup':
      return 'Ready to pickup';
    case 'out_for_delivery':
      return 'Out for delivery';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function getNextFulfillmentStatus(
  current: OrderStatus,
  workflow: OrderStatus[],
): OrderStatus | null {
  if (current === 'cancelled' || current === 'completed') return null;
  const index = workflow.indexOf(current);
  if (index === -1) return workflow[0] ?? null;
  if (index >= workflow.length - 1) return null;
  return workflow[index + 1];
}

export function getFulfillmentStepIndex(
  current: OrderStatus,
  workflow: OrderStatus[],
): number {
  if (current === 'cancelled') return -1;
  const index = workflow.indexOf(current);
  return index === -1 ? 0 : index;
}

export function isFulfillmentTerminal(status: OrderStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

export function canCancelOrder(status: OrderStatus): boolean {
  return status !== 'completed' && status !== 'cancelled';
}

export function fulfillmentMethodLabel(method: FulfillmentType): string {
  switch (method) {
    case 'pick_up':
      return 'Pickup';
    case 'shipping':
      return 'Shipping';
    default:
      return 'Delivery';
  }
}
