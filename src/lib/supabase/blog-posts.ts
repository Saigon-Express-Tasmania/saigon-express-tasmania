import { unstable_cache } from "next/cache";
import {
  BLOG_POST_DETAIL_REVALIDATE_SECONDS,
  CACHE_TAGS,
  SHORT_REVALIDATE_SECONDS,
} from "@/config";
import {
  mapBlogPostDetailRow,
  mapBlogPostRow,
  type BlogPost,
  type BlogPostDetail,
} from "@/types";
import {
  fetchBlogPostBySlug,
  fetchBlogPostRows,
  fetchRelatedBlogPostRows,
} from "./server";

const CACHE_TAG = CACHE_TAGS.blogPosts;

async function loadBlogPosts(): Promise<BlogPost[]> {
  const rows = await fetchBlogPostRows();
  return rows.map(mapBlogPostRow);
}

async function loadBlogPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  const row = await fetchBlogPostBySlug(slug);
  if (!row) {
    return null;
  }

  const relatedRows = await fetchRelatedBlogPostRows(row.id);
  const post = mapBlogPostDetailRow(row);
  post.relatedPosts = relatedRows.map(mapBlogPostRow);
  return post;
}

/**
 * Published blog posts for the public site, cached for at least one hour.
 */
export const getBlogPosts = unstable_cache(loadBlogPosts, [CACHE_TAG], {
  revalidate: SHORT_REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});

/**
 * Single published blog post by slug, cached for one week.
 */
export const getBlogPostBySlug = unstable_cache(
  loadBlogPostBySlug,
  [CACHE_TAG, "detail"],
  {
    revalidate: BLOG_POST_DETAIL_REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  },
);
