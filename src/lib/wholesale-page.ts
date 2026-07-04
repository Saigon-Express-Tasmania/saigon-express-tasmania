import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { getWholesaleInventorySnapshot } from "@/lib/supabase/wholesale-inventory-snapshot";
import {
  getGstTaxRate,
  getIsGstInclusive,
  getMinimumWholesaleOrderValue,
  getSettings,
} from "@/lib/supabase/settings";
import { getWholesaleProducts } from "@/lib/supabase/wholesale-products";
import { getWholesaleTiers } from "@/lib/supabase/wholesale-tiers";
import type {
  SiteCategory,
  SiteCategoryGroup,
  WholesalePricingTier,
  WholesaleProduct,
  WholesaleProductAvailabilityRow,
} from "@/types";
import { applyWholesaleProductAvailability } from "@/types";

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
  const [products, inventory, categoryCatalog, cartConfig] = await Promise.all([
    getWholesaleProducts(),
    getWholesaleInventorySnapshot(),
    getCategoryCatalogByKind("wholesale"),
    loadWholesaleCartConfig(),
  ]);

  const { categories: categoriesContent, categoryGroups } = categoryCatalog;
  const availabilityByProductId = new Map(
    inventory.map((row) => [row.product_id, row]),
  );

  return {
    products: products.map((product) =>
      applyWholesaleProductAvailability(
        product,
        availabilityByProductId.get(product.id),
      ),
    ),
    inventory,
    categoriesContent,
    categoryGroups,
    ...cartConfig,
  };
}
