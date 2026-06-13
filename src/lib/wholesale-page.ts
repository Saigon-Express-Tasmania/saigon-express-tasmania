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

export async function loadWholesalePageData(): Promise<WholesalePageData> {
  const [productRows, inventory, categoriesContent, pricingTiers, settings] =
    await Promise.all([
      fetchWholesaleProductRows(),
      getWholesaleInventorySnapshot(),
      getCategoriesByKind("wholesale"),
      getWholesaleTiers(),
      getSettings(),
    ]);

  return {
    products: mergeWholesaleProductsWithAvailability(productRows, inventory),
    inventory,
    categoriesContent,
    pricingTiers,
    minimumWholesaleOrderValue: getMinimumWholesaleOrderValue(settings),
  };
}
