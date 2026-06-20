import HomeJsonLd from "@/components/HomeJsonLd";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";

export default async function HomeJsonLdLoader() {
  const storeLocations = await getActiveStoreLocations();
  return <HomeJsonLd storeLocations={storeLocations} />;
}
