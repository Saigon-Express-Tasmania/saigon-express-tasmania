import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  BlogPostDetailRow,
  BlogPostRow,
  FeaturedReviewRow,
  JobListingRow,
  PromotionRow,
  DeliveryCityRow,
  StoreLocationRow,
} from "@/types";

let serverClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return url;
}

function getSupabaseKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  }
  return key;
}

/** Server-side Supabase client (anon key; RLS applies). */
export function createServerSupabaseClient(): SupabaseClient {
  if (!serverClient) {
    serverClient = createClient(getSupabaseUrl(), getSupabaseKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serverClient;
}

export async function fetchFeaturedReviewRows(): Promise<FeaturedReviewRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("featured_reviews")
    .select("id, reviewer_name, reviewer_picture, rating, review_text, location, is_featured, created_at")
    .eq("is_featured", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`featured_reviews: ${error.message}`);
  }

  return (data ?? []) as FeaturedReviewRow[];
}

export async function fetchStoreLocationRows(): Promise<StoreLocationRow[]> {
  const supabase = createServerSupabaseClient();
  // Anon key + RLS: UI-visible, invoice-creator, and shipping-origin rows are readable.
  const { data, error } = await supabase
    .from("store_locations")
    .select(
      "id, name, address, suburb, lat, lng, phone, email, hours, is_active, is_invoice_creator, is_shipping, delivery_url, google_map_url",
    );

  if (error) {
    throw new Error(`store_locations: ${error.message}`);
  }

  return (data ?? []) as StoreLocationRow[];
}

export async function fetchDeliveryCityRows(): Promise<DeliveryCityRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("delivery_cities")
    .select("id, name, postal_code, my_distance")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`delivery_cities: ${error.message}`);
  }

  return (data ?? []) as DeliveryCityRow[];
}

export async function fetchPromotionRows(): Promise<PromotionRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("promotions")
    .select(
      "id, title, description, badge, discount_label, image_url, cta_label, cta_href, starts_at, expires_at, is_active, sort_order, created_at, updated_at",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`promotions: ${error.message}`);
  }

  return (data ?? []) as PromotionRow[];
}

const BLOG_POST_LIST_SELECT =
  "id, slug, title, excerpt, category, featured_image_url, news_logo_image_url, published_at, view_count";

export async function fetchBlogPostRows(): Promise<BlogPostRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_LIST_SELECT)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error(`blog_posts: ${error.message}`);
  }

  return (data ?? []) as BlogPostRow[];
}

export async function fetchBlogPostBySlug(
  slug: string,
): Promise<BlogPostDetailRow | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, content, category, featured_image_url, news_logo_image_url, tags, published_at, view_count, show_wholesale_cta, counting_secret",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`blog_posts: ${error.message}`);
  }

  return (data as BlogPostDetailRow | null) ?? null;
}

const JOB_LISTING_SELECT =
  "id, title, department, employment_type, location, salary, badge, badge_color, summary, responsibilities, requirements, perks, is_active, sort_order, store_id, created_at, updated_at";

export async function fetchJobListingRows(): Promise<JobListingRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("job_listings")
    .select(JOB_LISTING_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`job_listings: ${error.message}`);
  }

  return (data ?? []) as JobListingRow[];
}

export async function fetchBlogPostCountingSecret(
  slug: string,
): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("counting_secret")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`blog_posts counting_secret: ${error.message}`);
  }

  return data?.counting_secret ?? null;
}

export async function fetchRelatedBlogPostRows(
  postId: number,
): Promise<BlogPostRow[]> {
  const supabase = createServerSupabaseClient();
  const { data: links, error: linksError } = await supabase
    .from("blog_post_related")
    .select("related_post_id, sort_order")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });

  if (linksError) {
    throw new Error(`blog_post_related: ${linksError.message}`);
  }

  if (!links?.length) {
    return [];
  }

  const relatedIds = links.map((link) => link.related_post_id);
  const { data: posts, error: postsError } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_LIST_SELECT)
    .in("id", relatedIds);

  if (postsError) {
    throw new Error(`blog_posts related: ${postsError.message}`);
  }

  const postsById = new Map(
    ((posts ?? []) as BlogPostRow[]).map((post) => [post.id, post]),
  );

  return relatedIds
    .map((id) => postsById.get(id))
    .filter((post): post is BlogPostRow => post !== undefined);
}
