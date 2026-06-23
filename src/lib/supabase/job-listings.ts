import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { mapJobListingRow, type JobListing } from "@/types/JobListing";
import { fetchJobListingRows } from "./server";

const CACHE_TAG = CACHE_TAGS.jobListings;

async function loadJobListings(): Promise<JobListing[]> {
  const rows = await fetchJobListingRows();
  return rows.map(mapJobListingRow);
}

/**
 * Active job listings for the public careers page, cached for at least one hour.
 */
export const getJobListings = unstable_cache(loadJobListings, [CACHE_TAG], {
  revalidate: SHORT_REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});
