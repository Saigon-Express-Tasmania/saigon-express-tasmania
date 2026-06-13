import WholesaleInventoryHydration from "@/components/WholesaleInventoryHydration";
import { loadWholesalePageData } from "@/lib/wholesale-page";
import MemberDashboard from "@/views/MemberDashboard";

export default async function LocaleMemberDashboardPage() {
  const { products, inventory, pricingTiers } = await loadWholesalePageData();

  return (
    <>
      <WholesaleInventoryHydration inventory={inventory} />
      <MemberDashboard
        locale="en"
        products={products}
        pricingTiers={pricingTiers}
      />
    </>
  );
}
