import WholesaleDashboard from "@/views/WholesaleDashboard";
import { loadWholesalePageData } from "@/lib/wholesale-page";

export default async function WholesaleDashboardPage() {
  const { products, categoriesContent } = await loadWholesalePageData();
  return (
    <WholesaleDashboard
      products={products}
      categoriesContent={categoriesContent}
    />
  );
}
