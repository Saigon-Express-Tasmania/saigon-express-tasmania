import { getWholesaleBusinessDateString } from "@/lib/wholesale-business-date";

export type WholesaleProductsAvailabilityRpcArgs = {
  p_customer_account: string | null;
  p_sale_date: string;
};

export function buildWholesaleProductsAvailabilityRpcArgs(
  customerAccount?: string | null,
  saleDate: string = getWholesaleBusinessDateString(),
): WholesaleProductsAvailabilityRpcArgs {
  return {
    p_customer_account: customerAccount ?? null,
    p_sale_date: saleDate,
  };
}

export function isWholesaleAvailabilityRpcMissing(error: {
  message?: string;
}): boolean {
  const message = error.message ?? "";
  return (
    message.includes("Could not find the function") &&
    message.includes("get_wholesale_products_availability")
  );
}
