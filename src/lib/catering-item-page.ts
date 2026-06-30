import { getCateringItemFromParam, getCateringPacks } from "@/lib/supabase/catering-packs";
import { getCategoriesByKind } from "@/lib/supabase/categories";
import { getProductCustomizationsCatalog } from "@/lib/supabase/product-customizations";
import type { ProductCustomizationsCatalog } from "@/lib/product-customizations";
import type { CateringPack } from "@/lib/supabase/catering-packs";
import type { SiteCategory } from "@/types";

export type CateringItemPageData = {
  item: CateringPack;
  packs: CateringPack[];
  categoriesContent: Pick<
    SiteCategory,
    "alias" | "name" | "customizationIds"
  >[];
  customizationsCatalog: ProductCustomizationsCatalog;
};

export async function loadCateringItemPageData(
  itemParam: string,
): Promise<CateringItemPageData | null> {
  const item = await getCateringItemFromParam(itemParam);
  if (!item) return null;

  const [packs, categoriesContent, customizationsCatalog] = await Promise.all([
    getCateringPacks(),
    getCategoriesByKind("catering"),
    getProductCustomizationsCatalog(),
  ]);

  return {
    item,
    packs,
    categoriesContent,
    customizationsCatalog,
  };
}
