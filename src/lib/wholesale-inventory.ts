import type { WholesaleProductAvailabilityRow } from "@/types";

export function wholesaleInventoryLimitMessage(
  itemName: string,
  requestedQty: number,
  availability: Pick<
    WholesaleProductAvailabilityRow,
    | "effective_remaining"
    | "global_remaining"
    | "customer_remaining"
    | "daily_customer_limit"
  >,
): string {
  const remaining = Math.max(availability.effective_remaining, 0);
  const overGlobal = requestedQty > availability.global_remaining;
  const hasCustomerCap = availability.daily_customer_limit != null;
  const customerRemaining = availability.customer_remaining;
  const overCustomer =
    hasCustomerCap &&
    customerRemaining != null &&
    requestedQty > customerRemaining;

  if (remaining <= 0) {
    if (overCustomer && overGlobal) {
      return `${itemName} has reached both today's store-wide limit and your personal daily limit. Try again tomorrow or choose another product.`;
    }
    if (overCustomer) {
      return `You have reached your daily limit of ${availability.daily_customer_limit} units for ${itemName}. Try again tomorrow.`;
    }
    return `${itemName} has reached today's store-wide limit. Try again tomorrow or choose another product.`;
  }

  if (overCustomer && (!overGlobal || customerRemaining === remaining)) {
    return `You can only order ${remaining} more units of ${itemName} today (your daily limit is ${availability.daily_customer_limit}).`;
  }

  if (overGlobal) {
    return `Only ${remaining} units of ${itemName} are left today across all customers. Please reduce the quantity in your cart.`;
  }

  return `Only ${remaining} units of ${itemName} are available today. Please reduce the quantity in your cart.`;
}
