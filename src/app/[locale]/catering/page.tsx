import { Suspense } from "react";
import { ProductCustomizationsProvider } from "@/contexts/ProductCustomizationsContext";
import { getCategoriesByKind } from "@/lib/supabase/categories";
import { getCateringPacks } from "@/lib/supabase/catering-packs";
import { getProductCustomizationsCatalog } from "@/lib/supabase/product-customizations";
import { pageMetadata } from "@/lib/seo-metadata";
import Catering from "@/views/Catering";

export const metadata = pageMetadata("catering");

export default async function LocalizedCateringPage() {
  const [packs, categoriesContent, customizationsCatalog] = await Promise.all([
    getCateringPacks(),
    getCategoriesByKind("catering"),
    getProductCustomizationsCatalog(),
  ]);
  return (
    <ProductCustomizationsProvider
      catalog={customizationsCatalog}
      categories={categoriesContent}
      categoryKey="name"
      kind="catering"
    >
      <Suspense fallback={null}>
        <Catering packs={packs} />
      </Suspense>
    </ProductCustomizationsProvider>
  );
}
