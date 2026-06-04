import { getWholesaleProducts } from "@/lib/supabase/wholesale-products";
import Wholesale from "@/views/Wholesale";

export default async function WholesaleLocalePage() {
  const products = await getWholesaleProducts();
  return <Wholesale products={products} />;
}
