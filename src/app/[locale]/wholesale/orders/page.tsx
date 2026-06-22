import { Suspense } from "react";
import WholesaleInventoryHydration from "@/components/WholesaleInventoryHydration";
import WholesaleOrders from "@/views/WholesaleOrders";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function LocaleWholesaleOrdersPage() {
  const { products, inventory } = await loadWholesalePageData();
  return (
    <>
      <WholesaleInventoryHydration inventory={inventory} />
      <Suspense fallback={null}>
        <WholesaleOrders products={products} />
      </Suspense>
    </>
  );
}
