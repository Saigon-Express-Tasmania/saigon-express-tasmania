import { DEFAULT_TIME_ZONE } from "@/config/localize";

/** Calendar date for wholesale daily inventory (matches DB wholesale_business_date). */
export function getWholesaleBusinessDateString(
  at: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIME_ZONE,
  }).format(at);
}
