import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FeaturedReviewRow } from "@/types";

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
    .select("id, reviewer_name, rating, review_text, location, is_featured, created_at")
    .eq("is_featured", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`featured_reviews: ${error.message}`);
  }

  return (data ?? []) as FeaturedReviewRow[];
}
