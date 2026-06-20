import { DEFAULT_MINIMUM_WHOLESALE_ORDER_VALUE } from "@/config/settings";
import type { WholesaleCartConfig } from "@/lib/wholesale-page";
import type { SiteContentSnapshot } from "@/types";

export const EMPTY_SITE_CONTENT_SNAPSHOT: SiteContentSnapshot = {
  settings: {},
  localization: {},
  loadedAt: new Date(0).toISOString(),
};

export const DEFAULT_WHOLESALE_CART_CONFIG: WholesaleCartConfig = {
  pricingTiers: [],
  minimumWholesaleOrderValue: DEFAULT_MINIMUM_WHOLESALE_ORDER_VALUE,
};
