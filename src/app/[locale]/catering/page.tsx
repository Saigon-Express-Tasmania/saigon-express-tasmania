import Catering from "@/views/Catering";
import { getCateringPacks } from "@/lib/supabase/catering-packs";

export default async function LocalizedCateringPage() {
  const packs = await getCateringPacks();
  return <Catering packs={packs} />;
}
