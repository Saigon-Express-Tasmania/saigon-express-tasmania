import Wholesale from "@/views/Wholesale";
import { getWholesaleProducts } from "@/lib/supabase/wholesale-products";

export default async function WholesalePage() {
  const products = await getWholesaleProducts();
  return <Wholesale products={products} />;
}
