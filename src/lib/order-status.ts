export type OrderStatus =
  | "pending"
  | "awaiting_payment"
  | "confirmed"
  | "preparing"
  | "packed"
  | "ready_to_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled"
  | "ready";

export type OrderStatusFilter = OrderStatus | "all";

export const ORDER_STATUS_FILTER_OPTIONS: {
  value: OrderStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "packed", label: "Packed" },
  { value: "ready_to_pickup", label: "Ready to pickup" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function normalizeOrderStatus(status: string): OrderStatus {
  if (status === "ready") return "ready_to_pickup";
  return status as OrderStatus;
}

export function getOrderStatusLabel(status: string): string {
  const normalized = normalizeOrderStatus(status);
  switch (normalized) {
    case "awaiting_payment":
      return "Awaiting payment";
    case "ready_to_pickup":
      return "Ready to pickup";
    case "out_for_delivery":
      return "Out for delivery";
    default:
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}

export function getOrderTrackingShortLabel(status: string): string | null {
  const normalized = normalizeOrderStatus(status);
  switch (normalized) {
    case "completed":
      return "Delivered";
    case "ready_to_pickup":
    case "packed":
      return "Ready";
    case "out_for_delivery":
      return "Out for delivery";
    case "preparing":
    case "confirmed":
      return "Processing";
    case "pending":
    case "awaiting_payment":
      return "Pending";
    case "cancelled":
      return "Cancelled";
    default:
      return null;
  }
}

export function getOrderTimelineIndex(status: string): number {
  const normalized = normalizeOrderStatus(status);
  switch (normalized) {
    case "pending":
    case "awaiting_payment":
      return 0;
    case "confirmed":
      return 1;
    case "preparing":
      return 2;
    case "packed":
      return 3;
    case "ready_to_pickup":
    case "out_for_delivery":
      return 4;
    case "completed":
      return 5;
    case "cancelled":
      return -1;
    default:
      return 0;
  }
}

export function isOrderPacked(status: string): boolean {
  const normalized = normalizeOrderStatus(status);
  return (
    normalized === "packed" ||
    normalized === "ready_to_pickup" ||
    normalized === "out_for_delivery" ||
    normalized === "completed"
  );
}

export function orderStatusIsPositive(status: string): boolean {
  const normalized = normalizeOrderStatus(status);
  return normalized === "completed" || normalized === "ready_to_pickup" || normalized === "packed";
}
