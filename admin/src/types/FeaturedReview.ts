export type FeaturedReview = {
  id: number;
  reviewer_name: string;
  reviewer_picture: string | null;
  rating: number;
  review_text: string;
  location: string | null;
  is_featured: boolean;
  created_at: string;
};

export type FeaturedReviewInput = {
  id: number;
  reviewer_name: string;
  reviewer_picture: string | null;
  rating: number;
  review_text: string;
  location: string | null;
  is_featured: boolean;
  created_at: string;
};

export const emptyFeaturedReviewInput = (): FeaturedReviewInput => ({
  id: 0,
  reviewer_name: '',
  reviewer_picture: null,
  rating: 5,
  review_text: '',
  location: null,
  is_featured: true,
  created_at: new Date().toISOString(),
});
