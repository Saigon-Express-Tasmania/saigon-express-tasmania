import StoreFinder from "@/views/StoreFinder";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";

export default async function LocaleStoresPage() {
  const stores = await getActiveStoreLocations();
  return <StoreFinder stores={stores} />;
}

