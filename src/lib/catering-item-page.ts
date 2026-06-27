import { getCateringItemFromParam, getCateringPacks } from "@/lib/supabase/catering-packs";
import type { CateringPack } from "@/lib/supabase/catering-packs";

export type CateringItemPageData = {
  item: CateringPack;
  packs: CateringPack[];
};

export async function loadCateringItemPageData(
  itemParam: string,
): Promise<CateringItemPageData | null> {
  const item = await getCateringItemFromParam(itemParam);
  if (!item) return null;

  const packs = await getCateringPacks();

  return {
    item,
    packs,
  };
}
