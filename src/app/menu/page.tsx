import Menu from "@/views/Menu";
import { getMenuItems } from "@/lib/supabase/menu";
import { getStoreLocations } from "@/lib/supabase/store-locations";

export default async function MenuPage() {
  const menuItems = await getMenuItems();
  const storeLocations = await getStoreLocations();
  return <Menu menuItems={menuItems} storeLocations={storeLocations} />;
}
