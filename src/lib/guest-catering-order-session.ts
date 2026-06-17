import type { OrderStatus } from "@/lib/order-status";

export const GUEST_CATERING_ORDER_STORAGE_KEY = "saigon-guest-catering-order";

export type GuestCateringOrderSession = {
  orderId: number;
  trackingToken: string;
  cancelToken: string;
  invoiceNumber: string;
  placedAt: number;
};

/** Guest session is kept only while quotation or payment is still outstanding. */
export function isGuestCateringOrderTrackable(
  status: OrderStatus | string | null | undefined,
): boolean {
  if (!status) return true;
  return status === "pending" || status === "awaiting_payment";
}

/** Guest may not start a new cart while a persisted session is unresolved. */
export function shouldBlockGuestCateringCart(
  session: GuestCateringOrderSession | null,
  trackedOrder: { status: string } | null,
  isSignedIn: boolean,
): boolean {
  if (isSignedIn || !session) return false;
  if (!trackedOrder) return true;
  return isGuestCateringOrderTrackable(trackedOrder.status);
}

export function formatGuestOrderId(orderId: number): string {
  return `SE-${orderId}`;
}
