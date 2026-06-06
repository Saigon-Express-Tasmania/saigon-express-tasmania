import WholesaleDashboard from "@/views/WholesaleDashboard";
import { getWholesaleProducts } from "@/lib/supabase/wholesale-products";

export default async function LocaleWholesaleDashboardPage() {
  const products = await getWholesaleProducts();
  return <WholesaleDashboard products={products} />;
}
