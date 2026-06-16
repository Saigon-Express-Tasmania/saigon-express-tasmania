import MemberCateringShop from "@/views/MemberCateringShop";
import { getCateringPacks } from "@/lib/supabase/catering-packs";

export default async function LocaleMemberCateringShopPage() {
  const packs = await getCateringPacks();
  return <MemberCateringShop packs={packs} />;
}
