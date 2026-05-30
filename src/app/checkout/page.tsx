import Checkout from "@/views/Checkout";
import { getStoreLocations } from "@/lib/supabase/store-locations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type PageProps = {
  searchParams: Promise<{ storeId?: string }>;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const storeLocations = await getStoreLocations();
  const initialStoreId = params.storeId ? parseInt(params.storeId, 10) : null;

  return (
    <Checkout
      storeLocations={storeLocations}
      initialStoreId={Number.isNaN(initialStoreId) ? null : initialStoreId}
    />
  );
}
