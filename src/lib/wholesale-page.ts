import { getCategoriesByKind } from "@/lib/supabase/categories";
import { getWholesaleProducts } from "@/lib/supabase/wholesale-products";
import type { SiteCategory, WholesaleProduct } from "@/types";

export type WholesalePageData = {
  products: WholesaleProduct[];
  categoriesContent: SiteCategory[];
};

export async function loadWholesalePageData(): Promise<WholesalePageData> {
  const [products, categoriesContent] = await Promise.all([
    getWholesaleProducts(),
    getCategoriesByKind("wholesale"),
  ]);

  return { products, categoriesContent };
}
