import { getCategoriesByKind } from "@/lib/supabase/categories";
import { mergeWholesaleProductsWithAvailability } from "@/lib/supabase/wholesale-availability";
import { getWholesaleInventorySnapshot } from "@/lib/supabase/wholesale-inventory-snapshot";
import {
  getMinimumWholesaleOrderValue,
  getSettings,
} from "@/lib/supabase/settings";
import { fetchWholesaleProductRows } from "@/lib/supabase/products";
import { getWholesaleTiers } from "@/lib/supabase/wholesale-tiers";
import type {
  SiteCategory,
  WholesalePricingTier,
  WholesaleProduct,
  WholesaleProductAvailabilityRow,
} from "@/types";

export type WholesalePageData = {
  products: WholesaleProduct[];
  inventory: WholesaleProductAvailabilityRow[];
  categoriesContent: SiteCategory[];
  pricingTiers: WholesalePricingTier[];
  minimumWholesaleOrderValue: number;
};

export type WholesaleCartConfig = Pick<
  WholesalePageData,
  "pricingTiers" | "minimumWholesaleOrderValue"
>;

export async function loadWholesaleCartConfig(): Promise<WholesaleCartConfig> {
  const [pricingTiers, settings] = await Promise.all([
    getWholesaleTiers(),
    getSettings(),
  ]);

  return {
    pricingTiers,
    minimumWholesaleOrderValue: getMinimumWholesaleOrderValue(settings),
  };
}

export async function loadWholesalePageData(): Promise<WholesalePageData> {
  const [productRows, inventory, categoriesContent, cartConfig] =
    await Promise.all([
      fetchWholesaleProductRows(),
      getWholesaleInventorySnapshot(),
      getCategoriesByKind("wholesale"),
      loadWholesaleCartConfig(),
    ]);

  return {
    products: mergeWholesaleProductsWithAvailability(productRows, inventory),
    inventory,
    categoriesContent,
    ...cartConfig,
  };
}
