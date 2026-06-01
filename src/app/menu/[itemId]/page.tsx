import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadMenuItemPageData } from "@/lib/menu-item-page";
import { getMenuItemFromParam } from "@/lib/supabase/menu-item";
import MenuItemView from "@/views/MenuItem";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { itemId } = await params;
  const item = await getMenuItemFromParam(itemId);
  if (!item) return { title: "Menu Item Not Found" };

  return {
    title: `${item.name} | Saigon Express Tasmania`,
    description:
      item.description ??
      `Order ${item.name} from Saigon Express Tasmania — authentic Vietnamese food.`,
  };
}

export default async function MenuItemPage({ params }: PageProps) {
  const { itemId } = await params;
  const data = await loadMenuItemPageData(itemId);
  if (!data) notFound();

  return <MenuItemView {...data} />;
}
