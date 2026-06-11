import WholesaleShop from "@/views/WholesaleShop";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function WholesaleShopPage() {
  const { products, categoriesContent, minimumWholesaleOrderValue } =
    await loadWholesalePageData();
  return (
    <WholesaleShop
      products={products}
      categoriesContent={categoriesContent}
      minimumWholesaleOrderValue={minimumWholesaleOrderValue}
    />
  );
}
