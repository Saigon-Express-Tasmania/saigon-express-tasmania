import Menu from "@/views/Menu";
import { getCategoriesByKind } from "@/lib/supabase/categories";
import { getMenuItems } from "@/lib/supabase/menu";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";

export default async function MenuPage() {
  const [menuItems, storeLocations, categoriesContent] = await Promise.all([
    getMenuItems(),
    getActiveStoreLocations(),
    getCategoriesByKind('menu'),
  ]);

  return (
    <Menu
      menuItems={menuItems}
      storeLocations={storeLocations}
      categoriesContent={categoriesContent}
    />
  );
}
