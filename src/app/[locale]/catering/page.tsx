import { Suspense } from "react";
import { ProductCustomizationsProvider } from "@/contexts/ProductCustomizationsContext";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { getCateringPacks } from "@/lib/supabase/catering-packs";
import { getProductCustomizationsCatalog } from "@/lib/supabase/product-customizations";
import { pageMetadata } from "@/lib/seo-metadata";
import Catering from "@/views/Catering";

export const metadata = pageMetadata("catering");

export default async function LocalizedCateringPage() {
  const [packs, categoryCatalog, customizationsCatalog] = await Promise.all([
    getCateringPacks(),
    getCategoryCatalogByKind("catering"),
    getProductCustomizationsCatalog(),
  ]);
  const { categories: categoriesContent, categoryGroups } = categoryCatalog;
  return (
    <ProductCustomizationsProvider
      catalog={customizationsCatalog}
      categories={categoriesContent}
      categoryKey="name"
      kind="catering"
    >
      <Suspense fallback={null}>
        <Catering
          packs={packs}
          categoriesContent={categoriesContent}
          categoryGroups={categoryGroups}
        />
      </Suspense>
    </ProductCustomizationsProvider>
  );
}
