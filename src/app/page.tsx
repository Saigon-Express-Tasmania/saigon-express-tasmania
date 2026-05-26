import HomePageClient from "@/components/HomePageClient";
import { getFeaturedReviews } from "@/lib/supabase/featured-reviews";
import { getMenuItems } from "@/lib/supabase/menu";

export default async function HomePage() {
  const [featuredReviews, menuItems] = await Promise.all([
    getFeaturedReviews(),
    getMenuItems(),
  ]);
  return <HomePageClient featuredReviews={featuredReviews} menuItems={menuItems} />;
}
