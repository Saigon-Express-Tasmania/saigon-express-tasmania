import WholesaleOrders from "@/views/WholesaleOrders";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function LocaleWholesaleOrdersPage() {
  const { products } = await loadWholesalePageData();
  return <WholesaleOrders products={products} />;
}
