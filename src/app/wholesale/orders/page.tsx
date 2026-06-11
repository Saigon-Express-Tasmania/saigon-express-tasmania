import WholesaleInventoryHydration from "@/components/WholesaleInventoryHydration";
import WholesaleOrders from "@/views/WholesaleOrders";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function WholesaleOrdersPage() {
  const { products, inventory } = await loadWholesalePageData();
  return (
    <>
      <WholesaleInventoryHydration inventory={inventory} />
      <WholesaleOrders products={products} />
    </>
  );
}
