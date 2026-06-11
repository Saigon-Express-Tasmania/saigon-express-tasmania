import WholesaleShop from "@/views/WholesaleShop";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function WholesaleShopPage() {
  const { products, inventory, categoriesContent, minimumWholesaleOrderValue } =
    await loadWholesalePageData();
  return (
    <WholesaleShop
      products={products}
      inventory={inventory}
      categoriesContent={categoriesContent}
      minimumWholesaleOrderValue={minimumWholesaleOrderValue}
    />
  );
}
