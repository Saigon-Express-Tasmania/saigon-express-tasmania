import { Suspense } from "react";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { getWholesaleProducts } from "@/lib/supabase/wholesale-products";
import { getWholesaleTiers } from "@/lib/supabase/wholesale-tiers";
import WholesaleLandingShop from "@/views/WholesaleLandingShop";

export default async function LocaleWholesaleLandingShopPage() {
  const [products, categoryCatalog, pricingTiers] = await Promise.all([
    getWholesaleProducts(),
    getCategoryCatalogByKind("wholesale"),
    getWholesaleTiers(),
  ]);
  const { categories: categoriesContent, categoryGroups } = categoryCatalog;
  return (
    <Suspense fallback={null}>
      <WholesaleLandingShop
        products={products}
        categoriesContent={categoriesContent}
        categoryGroups={categoryGroups}
        pricingTiers={pricingTiers}
      />
    </Suspense>
  );
}
