import { getCategoriesByKind } from "@/lib/supabase/categories";
import {
  getMinimumWholesaleOrderValue,
  getSettings,
} from "@/lib/supabase/settings";
import { getWholesaleProducts } from "@/lib/supabase/wholesale-products";
import { getWholesaleTiers } from "@/lib/supabase/wholesale-tiers";
import type {
  SiteCategory,
  WholesalePricingTier,
  WholesaleProduct,
} from "@/types";

export type WholesalePageData = {
  products: WholesaleProduct[];
  categoriesContent: SiteCategory[];
  pricingTiers: WholesalePricingTier[];
  minimumWholesaleOrderValue: number;
};

export async function loadWholesalePageData(): Promise<WholesalePageData> {
  const [products, categoriesContent, pricingTiers, settings] =
    await Promise.all([
      getWholesaleProducts(),
      getCategoriesByKind("wholesale"),
      getWholesaleTiers(),
      getSettings(),
    ]);

  return {
    products,
    categoriesContent,
    pricingTiers,
    minimumWholesaleOrderValue: getMinimumWholesaleOrderValue(settings),
  };
}
