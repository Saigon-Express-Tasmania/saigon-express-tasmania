import Menu from "@/views/Menu";
import { getMenuItems } from "@/lib/supabase/menu";
import { getStoreLocations } from "@/lib/supabase/store-locations";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function MenuPage() {
  const [menuItems, storeLocations] = await Promise.all([
    getMenuItems(),
    getStoreLocations(),
  ]);

  return <Menu menuItems={menuItems} storeLocations={storeLocations} />;
}
