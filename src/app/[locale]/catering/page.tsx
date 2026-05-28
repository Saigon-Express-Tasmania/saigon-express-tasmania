import Catering from "@/views/Catering";
import { getCateringPacks } from "@/lib/supabase/catering-packs";
import { getCateringBoxes } from "@/lib/supabase/catering-boxes";

export default async function LocalizedCateringPage() {
  const [packs, boxes] = await Promise.all([
    getCateringPacks(),
    getCateringBoxes(),
  ]);
  return <Catering packs={packs} boxes={boxes} />;
}

