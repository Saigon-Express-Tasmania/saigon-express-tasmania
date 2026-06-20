import ReviewsSection from "@/components/ReviewsSection";
import { getFeaturedReviews } from "@/lib/supabase/featured-reviews";

export default async function HomeFeaturedReviewsSection() {
  const featuredReviews = await getFeaturedReviews();

  if (featuredReviews.length === 0) {
    return null;
  }

  return <ReviewsSection reviews={featuredReviews} />;
}
