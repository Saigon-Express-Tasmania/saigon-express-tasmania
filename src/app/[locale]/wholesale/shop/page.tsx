import { Suspense } from "react";
import WholesaleShop from "@/views/WholesaleShop";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function LocaleWholesaleShopPage() {
  const { products, inventory, categoriesContent, categoryGroups } =
    await loadWholesalePageData();
  return (
    <Suspense fallback={null}>
      <WholesaleShop
        products={products}
        inventory={inventory}
        categoriesContent={categoriesContent}
        categoryGroups={categoryGroups}
      />
    </Suspense>
  );
}
