import { getCategoriesByKind } from "@/lib/supabase/categories";
import { getMenuItemFromParam } from "@/lib/supabase/menu-item";
import { getMenuItems } from "@/lib/supabase/menu";
import { getProductCustomizationsCatalog } from "@/lib/supabase/product-customizations";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";
import type { MenuItem } from "@/contexts/CartContext";
import type { ProductCustomizationsCatalog } from "@/lib/product-customizations";
import type { SiteCategory, StoreLocation } from "@/types";

export type MenuItemPageData = {
  item: MenuItem;
  menuItems: MenuItem[];
  categoriesContent: SiteCategory[];
  storeLocations: StoreLocation[];
  customizationsCatalog: ProductCustomizationsCatalog;
};

export async function loadMenuItemPageData(
  itemParam: string,
): Promise<MenuItemPageData | null> {
  const item = await getMenuItemFromParam(itemParam);
  if (!item) return null;

  const [menuItems, categoriesContent, storeLocations, customizationsCatalog] =
    await Promise.all([
      getMenuItems(),
      getCategoriesByKind("menu"),
      getActiveStoreLocations(),
      getProductCustomizationsCatalog(),
    ]);

  return {
    item,
    menuItems,
    categoriesContent,
    storeLocations,
    customizationsCatalog,
  };
}
