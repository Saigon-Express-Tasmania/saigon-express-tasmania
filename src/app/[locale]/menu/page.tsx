import Menu from "@/views/Menu";
import { getMenuItems } from "@/lib/supabase/menu";

export default async function LocaleMenuPage() {
  const menuItems = await getMenuItems();
  return <Menu menuItems={menuItems} />;
}

