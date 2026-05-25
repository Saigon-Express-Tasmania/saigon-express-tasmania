/** Row shape from `public.featured_reviews` (snake_case). */
export type FeaturedReviewRow = {
  id: number;
  reviewer_name: string;
  rating: number;
  review_text: string;
  location: string | null;
  is_featured: boolean;
  created_at: string;
};

/** Review used by UI components (camelCase). */
export type FeaturedReview = {
  id: number;
  reviewerName: string;
  rating: number;
  reviewText: string;
  location: string | null;
  isFeatured: boolean;
  createdAt: string;
};

export function mapFeaturedReviewRow(row: FeaturedReviewRow): FeaturedReview {
  return {
    id: row.id,
    reviewerName: row.reviewer_name,
    rating: row.rating,
    reviewText: row.review_text,
    location: row.location,
    isFeatured: row.is_featured,
    createdAt: row.created_at,
  };
}
