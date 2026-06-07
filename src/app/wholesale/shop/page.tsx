import WholesaleShop from "@/views/WholesaleShop";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function WholesaleShopPage() {
  const { products, categoriesContent, pricingTiers } =
    await loadWholesalePageData();
  return (
    <WholesaleShop
      products={products}
      categoriesContent={categoriesContent}
      pricingTiers={pricingTiers}
    />
  );
}
