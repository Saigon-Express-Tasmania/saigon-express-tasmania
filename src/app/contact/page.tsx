import Contact from "@/views/Contact";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";

export default async function ContactPage() {
  const storeLocations = await getActiveStoreLocations();
  return <Contact storeLocations={storeLocations} />;
}
