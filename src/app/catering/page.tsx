import Catering from "@/views/Catering";
import { getCateringPacks } from "@/lib/supabase/catering-packs";

export default async function CateringPage() {
  const packs = await getCateringPacks();
  return <Catering packs={packs} />;
}
