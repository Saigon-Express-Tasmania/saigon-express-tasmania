import Menu from "@/views/Menu";
import { getCategories } from "@/lib/supabase/categories";
import { getMenuItems } from "@/lib/supabase/menu";
import { getStoreLocations } from "@/lib/supabase/store-locations";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function LocaleMenuPage() {
  const [menuItems, storeLocations, categoriesContent] = await Promise.all([
    getMenuItems(),
    getStoreLocations(),
    getCategories(),
  ]);
  return (
    <Menu
      menuItems={menuItems}
      storeLocations={storeLocations}
      categoriesContent={categoriesContent}
    />
  );
}

