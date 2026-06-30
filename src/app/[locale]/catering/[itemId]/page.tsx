import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCateringItemPageData } from "@/lib/catering-item-page";
import { getCateringItemFromParam } from "@/lib/supabase/catering-packs";
import { ProductCustomizationsProvider } from "@/contexts/ProductCustomizationsContext";
import CateringItemView from "@/views/CateringItem";

type PageProps = {
  params: Promise<{ locale: string; itemId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { itemId } = await params;
  const item = await getCateringItemFromParam(itemId);
  if (!item) return { title: "Catering Item Not Found" };

  return {
    title: `${item.name} | Saigon Express Catering`,
    description:
      item.description ||
      `Order ${item.name} from Saigon Express Catering — authentic Vietnamese catering across Tasmania.`,
  };
}

export default async function LocaleCateringItemPage({ params }: PageProps) {
  const { itemId } = await params;
  const data = await loadCateringItemPageData(itemId);
  if (!data) notFound();

  return (
    <ProductCustomizationsProvider
      catalog={data.customizationsCatalog}
      categories={data.categoriesContent}
      categoryKey="name"
      kind="catering"
    >
      <CateringItemView item={data.item} packs={data.packs} />
    </ProductCustomizationsProvider>
  );
}
