import Wholesale from "@/views/Wholesale";
import { getWholesaleProducts } from "@/lib/supabase/wholesale-products";
import { getWholesaleTiers } from "@/lib/supabase/wholesale-tiers";

export default async function WholesalePage() {
  const [products, pricingTiers] = await Promise.all([
    getWholesaleProducts(),
    getWholesaleTiers(),
  ]);

  return <Wholesale products={products} pricingTiers={pricingTiers} />;
}
