import { getCategoriesByKind } from "@/lib/supabase/categories";
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
};

export async function loadWholesalePageData(): Promise<WholesalePageData> {
  const [products, categoriesContent, pricingTiers] = await Promise.all([
    getWholesaleProducts(),
    getCategoriesByKind("wholesale"),
    getWholesaleTiers(),
  ]);

  return { products, categoriesContent, pricingTiers };
}
