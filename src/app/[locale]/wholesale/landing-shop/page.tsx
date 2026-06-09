import WholesaleLandingShop from "@/views/WholesaleLandingShop";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function LocaleWholesaleLandingShopPage() {
  const { products, categoriesContent, pricingTiers } =
    await loadWholesalePageData();
  return (
    <WholesaleLandingShop
      products={products}
      categoriesContent={categoriesContent}
      pricingTiers={pricingTiers}
    />
  );
}
