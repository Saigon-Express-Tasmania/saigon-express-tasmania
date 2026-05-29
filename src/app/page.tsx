import { getFeaturedReviews } from "@/lib/supabase/featured-reviews";
import { getMenuItems } from "@/lib/supabase/menu";
import Home from "@/views/Home";

export default async function HomePage() {
  const [featuredReviews, menuItems] = await Promise.all([
    getFeaturedReviews(),
    getMenuItems(),
  ]);
  return <Home featuredReviews={featuredReviews} menuItems={menuItems} />;
}
