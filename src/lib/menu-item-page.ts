import { getCategories } from "@/lib/supabase/categories";
import { getMenuItemFromParam } from "@/lib/supabase/menu-item";
import { getMenuItems } from "@/lib/supabase/menu";
import { getStoreLocations } from "@/lib/supabase/store-locations";
import type { MenuItem } from "@/contexts/CartContext";
import type { SiteCategory, StoreLocation } from "@/types";

export type MenuItemPageData = {
  item: MenuItem;
  menuItems: MenuItem[];
  categoriesContent: SiteCategory[];
  storeLocations: StoreLocation[];
};

export async function loadMenuItemPageData(
  itemParam: string,
): Promise<MenuItemPageData | null> {
  const item = await getMenuItemFromParam(itemParam);
  if (!item) return null;

  const [menuItems, categoriesContent, storeLocations] = await Promise.all([
    getMenuItems(),
    getCategories(),
    getStoreLocations(),
  ]);

  return { item, menuItems, categoriesContent, storeLocations };
}
