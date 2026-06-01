import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MenuItemView from "@/views/MenuItem";
import { getCategories } from "@/lib/supabase/categories";
import { getMenuItemById } from "@/lib/supabase/menu-item";
import { getMenuItems } from "@/lib/supabase/menu";
import { getStoreLocations } from "@/lib/supabase/store-locations";

type PageProps = {
  params: Promise<{ locale: string; itemId: string }>;
};

function parseItemId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { itemId } = await params;
  const id = parseItemId(itemId);
  if (id === null) return { title: "Menu Item" };

  const item = await getMenuItemById(id);
  if (!item) return { title: "Menu Item Not Found" };

  return {
    title: `${item.name} | Saigon Express Tasmania`,
    description:
      item.description ??
      `Order ${item.name} from Saigon Express Tasmania — authentic Vietnamese food.`,
  };
}

export default async function LocaleMenuItemPage({ params }: PageProps) {
  const { itemId } = await params;
  const id = parseItemId(itemId);
  if (id === null) notFound();

  const [item, menuItems, categoriesContent, storeLocations] =
    await Promise.all([
      getMenuItemById(id),
      getMenuItems(),
      getCategories(),
      getStoreLocations(),
    ]);

  if (!item) notFound();

  return (
    <MenuItemView
      item={item}
      menuItems={menuItems}
      categoriesContent={categoriesContent}
      storeLocations={storeLocations}
    />
  );
}
