import { parseNumericCateringItemId } from "@/lib/catering-item-routes";
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

function findCateringItemInList(
  itemParam: string,
  packs: CateringPack[],
): CateringPack | null {
  const id = parseNumericCateringItemId(itemParam);
  if (id === null) return null;
  return packs.find((pack) => pack.id === id) ?? null;
}

export async function loadCateringItemForRequest(
  itemParam: string,
): Promise<CateringPack | null> {
  const packs = await getCateringPacks();
  const pack = findCateringItemInList(itemParam, packs);
  if (pack) return pack;

  // Fallback keeps direct item URLs working even if a pack is not in the
  // public catering list returned by getCateringPacks().
  return getCateringItemFromParam(itemParam);
}

export async function loadCateringItemPageData(
  itemParam: string,
): Promise<CateringItemPageData | null> {
  const [packs, categoriesContent, customizationsCatalog] = await Promise.all([
    getCateringPacks(),
    getCategoriesByKind("catering"),
    getProductCustomizationsCatalog(),
  ]);

  const item =
    findCateringItemInList(itemParam, packs) ??
    (await getCateringItemFromParam(itemParam));
  if (!item) return null;

  return {
    item,
    packs,
    categoriesContent,
    customizationsCatalog,
  };
}
