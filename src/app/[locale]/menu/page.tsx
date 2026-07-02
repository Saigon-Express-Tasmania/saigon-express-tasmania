import { Suspense } from "react";
import { ProductCustomizationsProvider } from "@/contexts/ProductCustomizationsContext";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { getMenuItems } from "@/lib/supabase/menu";
import { getProductCustomizationsCatalog } from "@/lib/supabase/product-customizations";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";
import { pageMetadata } from "@/lib/seo-metadata";
import Menu from "@/views/Menu";

export const metadata = pageMetadata("menu");

export default async function LocaleMenuPage() {
  const [menuItems, storeLocations, categoryCatalog, customizationsCatalog] =
    await Promise.all([
      getMenuItems(),
      getActiveStoreLocations(),
      getCategoryCatalogByKind("menu"),
      getProductCustomizationsCatalog(),
    ]);
  const { categories: categoriesContent, categoryGroups } = categoryCatalog;
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
          categoryGroups={categoryGroups}
        />
      </Suspense>
    </ProductCustomizationsProvider>
  );
}
