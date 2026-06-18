import { getCateringPacks } from "@/lib/supabase/catering-packs";
import { pageMetadata } from "@/lib/seo-metadata";
import Catering from "@/views/Catering";

export const metadata = pageMetadata("catering");

export default async function LocalizedCateringPage() {
  const packs = await getCateringPacks();
  return <Catering packs={packs} />;
}
