import Contact from "@/views/Contact";
import { getStoreLocations } from "@/lib/supabase/store-locations";

export default async function LocaleContactPage() {
  const storeLocations = await getStoreLocations();
  return <Contact storeLocations={storeLocations} />;
}

