import Menu from "@/views/Menu";
import { getMenuItems } from "@/lib/supabase/menu";
import { getStoreLocations } from "@/lib/supabase/store-locations";

export default async function LocaleMenuPage() {
  const [menuItems, storeLocations] = await Promise.all([
    getMenuItems(),
    getStoreLocations(),
  ]);
  return <Menu menuItems={menuItems} storeLocations={storeLocations} />;
}

