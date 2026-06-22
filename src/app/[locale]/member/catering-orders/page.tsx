import { Suspense } from "react";
import MemberCateringOrders from "@/views/MemberCateringOrders";

export default function LocaleMemberCateringOrdersPage() {
  return (
    <Suspense fallback={null}>
      <MemberCateringOrders />
    </Suspense>
  );
}
