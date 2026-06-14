import StoreFinder from "@/views/StoreFinder";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";

export default async function StoresPage() {
  const stores = await getActiveStoreLocations();
  return <StoreFinder stores={stores} />;
}
