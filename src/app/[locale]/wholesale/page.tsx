import { pageMetadata } from "@/lib/seo-metadata";
import { getWholesaleProducts } from "@/lib/supabase/wholesale-products";
import { getWholesaleTiers } from "@/lib/supabase/wholesale-tiers";
import Wholesale from "@/views/Wholesale";

export const metadata = pageMetadata("wholesale");

export default async function WholesaleLocalePage() {
  const [products, pricingTiers] = await Promise.all([
    getWholesaleProducts(),
    getWholesaleTiers(),
  ]);
  return <Wholesale products={products} pricingTiers={pricingTiers} />;
}
