import { Suspense } from "react";
import WholesaleLandingShop from "@/views/WholesaleLandingShop";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function LocaleWholesaleLandingShopPage() {
  const { products, categoriesContent, pricingTiers } =
    await loadWholesalePageData();
  return (
    <Suspense fallback={null}>
      <WholesaleLandingShop
        products={products}
        categoriesContent={categoriesContent}
        pricingTiers={pricingTiers}
      />
    </Suspense>
  );
}
