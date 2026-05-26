import StoreFinder from "@/views/StoreFinder";
import { getStoreLocations } from "@/lib/supabase/store-locations";

export default async function LocaleStoresPage() {
  const stores = await getStoreLocations();
  return <StoreFinder stores={stores} />;
}

