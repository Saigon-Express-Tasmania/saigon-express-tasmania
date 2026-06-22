import { Suspense } from "react";
import { getCategoriesByKind } from "@/lib/supabase/categories";
import { getMenuItems } from "@/lib/supabase/menu";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";
import { pageMetadata } from "@/lib/seo-metadata";
import Menu from "@/views/Menu";

export const metadata = pageMetadata("menu");

export default async function LocaleMenuPage() {
  const [menuItems, storeLocations, categoriesContent] = await Promise.all([
    getMenuItems(),
    getActiveStoreLocations(),
    getCategoriesByKind("menu"),
  ]);
  return (
    <Suspense fallback={null}>
      <Menu
        menuItems={menuItems}
        storeLocations={storeLocations}
        categoriesContent={categoriesContent}
      />
    </Suspense>
  );
}
