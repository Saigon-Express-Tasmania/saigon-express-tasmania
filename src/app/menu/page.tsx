import Menu from "@/views/Menu";
import { getMenuItems } from "@/lib/supabase/menu";

export default async function MenuPage() {
  const menuItems = await getMenuItems();
  return <Menu menuItems={menuItems} />;
}
