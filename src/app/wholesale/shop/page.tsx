import WholesaleShop from "@/views/WholesaleShop";
import { getWholesaleProducts } from "@/lib/supabase/wholesale-products";

export default async function WholesaleShopPage() {
  const products = await getWholesaleProducts();
  return <WholesaleShop products={products} />;
}
