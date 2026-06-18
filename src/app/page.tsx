import HomeJsonLd from "@/components/HomeJsonLd";
import { getRandomCategoriesByKind } from "@/lib/supabase/categories";
import { getFeaturedReviews } from "@/lib/supabase/featured-reviews";
import { getMenuItems } from "@/lib/supabase/menu";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";
import Home from "@/views/Home";

export default async function HomePage() {
  const [
    featuredReviews,
    menuItems,
    categoryContents,
    cateringContents,
    wholesaleContents,
    storeLocations,
  ] = await Promise.all([
    getFeaturedReviews(),
    getMenuItems(),
    getRandomCategoriesByKind("menu", 6),
    getRandomCategoriesByKind("catering", 6),
    getRandomCategoriesByKind("wholesale", 6),
    getActiveStoreLocations(),
  ]);

  return (
    <>
      <HomeJsonLd storeLocations={storeLocations} />
      <Home
        featuredReviews={featuredReviews}
        menuItems={menuItems}
        categoryContents={categoryContents}
        cateringContents={cateringContents}
        wholesaleContents={wholesaleContents}
      />
    </>
  );
}
