import { Suspense } from "react";
import { ProductCustomizationsProvider } from "@/contexts/ProductCustomizationsContext";
import { getCategoriesByKind } from "@/lib/supabase/categories";
import { getMenuItems } from "@/lib/supabase/menu";
import { getProductCustomizationsCatalog } from "@/lib/supabase/product-customizations";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";
import { pageMetadata } from "@/lib/seo-metadata";
import Menu from "@/views/Menu";

export const metadata = pageMetadata("menu");

export default async function LocaleMenuPage() {
  const [menuItems, storeLocations, categoriesContent, customizationsCatalog] =
    await Promise.all([
      getMenuItems(),
      getActiveStoreLocations(),
      getCategoriesByKind("menu"),
      getProductCustomizationsCatalog(),
    ]);
  return (
    <ProductCustomizationsProvider
      catalog={customizationsCatalog}
      categories={categoriesContent}
    >
      <Suspense fallback={null}>
        <Menu
          menuItems={menuItems}
          storeLocations={storeLocations}
          categoriesContent={categoriesContent}
        />
      </Suspense>
    </ProductCustomizationsProvider>
  );
}
