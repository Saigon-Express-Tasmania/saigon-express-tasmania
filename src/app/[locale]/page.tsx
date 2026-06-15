import { getRandomCategoriesByKind } from "@/lib/supabase/categories";
import { getFeaturedReviews } from "@/lib/supabase/featured-reviews";
import { getMenuItems } from "@/lib/supabase/menu";
import Home from "@/views/Home";

export default async function LocaleHomePage() {
  const [
    featuredReviews,
    menuItems,
    categoryContents,
    cateringContents,
    wholesaleContents,
  ] = await Promise.all([
    getFeaturedReviews(),
    getMenuItems(),
    getRandomCategoriesByKind("menu", 6),
    getRandomCategoriesByKind("catering", 6),
    getRandomCategoriesByKind("wholesale", 6),
  ]);

  console.log(wholesaleContents);

  return (
    <Home
      featuredReviews={featuredReviews}
      menuItems={menuItems}
      categoryContents={categoryContents}
      cateringContents={cateringContents}
      wholesaleContents={wholesaleContents}
    />
  );
}
