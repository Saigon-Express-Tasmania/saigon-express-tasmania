import { unstable_cache } from "next/cache";
import { mapFeaturedReviewRow, type FeaturedReview } from "@/types";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { fetchFeaturedReviewRows } from "./server";

const CACHE_TAG = "featured-reviews";
const REVALIDATE_SECONDS = 60 * 60; // 1 hour

async function loadFeaturedReviews(): Promise<FeaturedReview[]> {
  const rows = await fetchFeaturedReviewRows();
  return rows.map(mapFeaturedReviewRow);
}

/**
 * Featured reviews for the public site, cached for at least one hour.
 * Cache key includes SERVER_CACHE_INSTANCE_ID so entries reset on server restart.
 */
export const getFeaturedReviews = unstable_cache(
  loadFeaturedReviews,
  [CACHE_TAG, SERVER_CACHE_INSTANCE_ID],
  { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
);
