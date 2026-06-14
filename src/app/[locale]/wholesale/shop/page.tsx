import WholesaleShop from "@/views/WholesaleShop";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function LocaleWholesaleShopPage() {
  const { products, inventory, categoriesContent, minimumWholesaleOrderValue, pricingTiers } =
    await loadWholesalePageData();
  return (
    <WholesaleShop
      products={products}
      inventory={inventory}
      categoriesContent={categoriesContent}
      minimumWholesaleOrderValue={minimumWholesaleOrderValue}
      pricingTiers={pricingTiers}
    />
  );
}
