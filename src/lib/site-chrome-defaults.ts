import { DEFAULT_GST_TAX_RATE, DEFAULT_IS_GST_INCLUSIVE, DEFAULT_MINIMUM_WHOLESALE_ORDER_VALUE } from "@/config/settings";
import { DEFAULT_SELF_DELIVERY_FEE, DEFAULT_SELF_DELIVERY_ORIGIN } from "@/lib/self-delivery-fee";
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
  gstTaxRate: DEFAULT_GST_TAX_RATE,
  isGstInclusive: DEFAULT_IS_GST_INCLUSIVE,
};

export { DEFAULT_SELF_DELIVERY_FEE, DEFAULT_SELF_DELIVERY_ORIGIN };
