import Promotions from "@/views/Promotions";
import { getPromotions } from "@/lib/supabase/promotions";

export default async function LocalePromotionsPage() {
  const promotions = await getPromotions();
  return <Promotions promotions={promotions} />;
}

