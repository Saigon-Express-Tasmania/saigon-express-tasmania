import { Suspense } from "react";
import MemberCateringShop from "@/views/MemberCateringShop";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { getCateringPacks } from "@/lib/supabase/catering-packs";

export default async function LocaleMemberCateringShopPage() {
  const [packs, categoryCatalog] = await Promise.all([
    getCateringPacks(),
    getCategoryCatalogByKind("catering"),
  ]);
  const { categories: categoriesContent, categoryGroups } = categoryCatalog;

  return (
    <Suspense fallback={null}>
      <MemberCateringShop
        packs={packs}
        categoriesContent={categoriesContent}
        categoryGroups={categoryGroups}
      />
    </Suspense>
  );
}
