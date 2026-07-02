import { Suspense } from "react";
import WholesaleLandingShop from "@/views/WholesaleLandingShop";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function LocaleWholesaleLandingShopPage() {
  const { products, categoriesContent, categoryGroups, pricingTiers } =
    await loadWholesalePageData();
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
