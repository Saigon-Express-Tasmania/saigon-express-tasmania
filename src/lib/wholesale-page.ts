import { getWholesaleInventorySnapshot } from "@/lib/supabase/wholesale-inventory-snapshot";
import {
  getGstTaxRate,
  getIsGstInclusive,
  getMinimumWholesaleOrderValue,
  getSettings,
} from "@/lib/supabase/settings";
import {
  getWholesaleProducts,
  getWholesaleProductsPage,
} from "@/lib/supabase/wholesale-products";
import { getWholesaleTiers } from "@/lib/supabase/wholesale-tiers";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { getPopulatedCategoryIdsByProductType } from "@/lib/supabase/product-categories";
import type { ProductCatalogPageParams } from "@/lib/product-catalog-page";
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

export type WholesaleCatalogPageData = WholesalePageData & {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

function filterInventoryForProductIds(
  inventory: WholesaleProductAvailabilityRow[],
  productIds: ReadonlySet<number>,
): WholesaleProductAvailabilityRow[] {
  if (productIds.size === 0) return [];
  return inventory.filter((row) => productIds.has(row.product_id));
}

function mergeProductsWithInventory(
  products: WholesaleProduct[],
  inventory: WholesaleProductAvailabilityRow[],
): WholesaleProduct[] {
  const availabilityByProductId = new Map(
    inventory.map((row) => [row.product_id, row]),
  );
  return products.map((product) =>
    applyWholesaleProductAvailability(
      product,
      availabilityByProductId.get(product.id),
    ),
  );
}

/**
 * Full wholesale catalog + inventory for dashboard/orders (long-lived product cache).
 */
export async function loadWholesalePageData(): Promise<WholesalePageData> {
  const [products, inventory, categoryCatalog, cartConfig] = await Promise.all([
    getWholesaleProducts(),
    getWholesaleInventorySnapshot(),
    getCategoryCatalogByKind("wholesale"),
    loadWholesaleCartConfig(),
  ]);

  const { categories: categoriesContent, categoryGroups } = categoryCatalog;

  return {
    products: mergeProductsWithInventory(products, inventory),
    inventory,
    categoriesContent,
    categoryGroups,
    ...cartConfig,
  };
}

/**
 * Paginated shop catalog. Product page is cached; stock is merged separately
 * for current page IDs only. Catalog + stock fetch in parallel.
 */
export async function loadWholesaleCatalogPageData(
  pageParams: ProductCatalogPageParams,
  categoryCatalog: {
    categories: SiteCategory[];
    categoryGroups: SiteCategoryGroup[];
  },
): Promise<WholesaleCatalogPageData> {
  const { categories: categoriesContent, categoryGroups } = categoryCatalog;

  const [cartConfig, productPage, inventorySnapshot] = await Promise.all([
    loadWholesaleCartConfig(),
    getWholesaleProductsPage(pageParams, categoriesContent),
    getWholesaleInventorySnapshot(),
  ]);

  const productIds = new Set(productPage.items.map((product) => product.id));
  const inventory = filterInventoryForProductIds(inventorySnapshot, productIds);

  return {
    products: mergeProductsWithInventory(productPage.items, inventory),
    inventory,
    categoriesContent,
    categoryGroups,
    totalCount: productPage.totalCount,
    page: productPage.page,
    pageSize: productPage.pageSize,
    totalPages: productPage.totalPages,
    ...cartConfig,
  };
}

export function loadWholesalePopulatedCategoryIds() {
  return getPopulatedCategoryIdsByProductType("wholesale");
}
