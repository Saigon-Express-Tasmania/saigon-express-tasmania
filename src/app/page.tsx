import HomePageClient from "@/components/HomePageClient";
import { getFeaturedReviews } from "@/lib/supabase/featured-reviews";

export default async function HomePage() {
  const featuredReviews = await getFeaturedReviews();
  return <HomePageClient featuredReviews={featuredReviews} />;
}
