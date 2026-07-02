import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { mergeWholesaleProductsWithAvailability } from "@/lib/supabase/wholesale-availability";
import { getWholesaleInventorySnapshot } from "@/lib/supabase/wholesale-inventory-snapshot";
import {
  getGstTaxRate,
  getIsGstInclusive,
  getMinimumWholesaleOrderValue,
  getSettings,
} from "@/lib/supabase/settings";
import { fetchWholesaleProductRows } from "@/lib/supabase/products";
import { getWholesaleTiers } from "@/lib/supabase/wholesale-tiers";
import { categoryMapById } from "@/lib/product-category";
import type {
  SiteCategory,
  SiteCategoryGroup,
  WholesalePricingTier,
  WholesaleProduct,
  WholesaleProductAvailabilityRow,
} from "@/types";

export type WholesalePageData = {
  products: WholesaleProduct[];
  inventory: WholesaleProductAvailabilityRow[];
  categoriesContent: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
  pricingTiers: WholesalePricingTier[];
  minimumWholesaleOrderValue: number;
  gstTaxRate: number;
  isGstInclusive: boolean;
};

export type WholesaleCartConfig = {
  pricingTiers: WholesalePricingTier[];
  minimumWholesaleOrderValue: number;
  gstTaxRate: number;
  isGstInclusive: boolean;
};

export async function loadWholesaleCartConfig(): Promise<WholesaleCartConfig> {
  const [pricingTiers, settings] = await Promise.all([
    getWholesaleTiers(),
    getSettings(),
  ]);

  return {
    pricingTiers,
    minimumWholesaleOrderValue: getMinimumWholesaleOrderValue(settings),
    gstTaxRate: getGstTaxRate(settings),
    isGstInclusive: getIsGstInclusive(settings),
  };
}

export async function loadWholesalePageData(): Promise<WholesalePageData> {
  const [productRows, inventory, categoryCatalog, cartConfig] =
    await Promise.all([
      fetchWholesaleProductRows(),
      getWholesaleInventorySnapshot(),
      getCategoryCatalogByKind("wholesale"),
      loadWholesaleCartConfig(),
    ]);

  const { categories: categoriesContent, categoryGroups } = categoryCatalog;

  return {
    products: mergeWholesaleProductsWithAvailability(
      productRows,
      inventory,
      categoryMapById(categoriesContent),
    ),
    inventory,
    categoriesContent,
    categoryGroups,
    ...cartConfig,
  };
}
