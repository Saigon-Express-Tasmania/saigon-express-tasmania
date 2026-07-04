import { getCategoriesByKind } from "@/lib/supabase/categories";
import { parseNumericMenuItemId } from "@/lib/menu-item-routes";
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

function findMenuItemInList(
  itemParam: string,
  menuItems: MenuItem[],
): MenuItem | null {
  const id = parseNumericMenuItemId(itemParam);
  if (id !== null) {
    return menuItems.find((menuItem) => menuItem.id === id) ?? null;
  }

  const slug = decodeURIComponent(itemParam).trim();
  if (!slug) return null;
  return menuItems.find((menuItem) => menuItem.slug?.trim() === slug) ?? null;
}

export async function loadMenuItemForRequest(
  itemParam: string,
): Promise<MenuItem | null> {
  const menuItems = await getMenuItems();
  const menuItem = findMenuItemInList(itemParam, menuItems);
  if (menuItem) return menuItem;

  // Fallback keeps current behavior for items that are not in the public list
  // (for example, unavailable items addressed directly by id or slug).
  return getMenuItemFromParam(itemParam);
}

export async function loadMenuItemPageData(
  itemParam: string,
): Promise<MenuItemPageData | null> {
  const [menuItems, categoriesContent, storeLocations, customizationsCatalog] =
    await Promise.all([
      getMenuItems(),
      getCategoriesByKind("menu"),
      getActiveStoreLocations(),
      getProductCustomizationsCatalog(),
    ]);

  const item =
    findMenuItemInList(itemParam, menuItems) ??
    (await getMenuItemFromParam(itemParam));
  if (!item) return null;

  return {
    item,
    menuItems,
    categoriesContent,
    storeLocations,
    customizationsCatalog,
  };
}
