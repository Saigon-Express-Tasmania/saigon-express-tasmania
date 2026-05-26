import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FeaturedReviewRow, MenuItemRow, StoreLocationRow, PromotionRow, WholesaleProductRow } from "@/types";

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

export async function fetchMenuItemRows(): Promise<MenuItemRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("menu")
    .select(
      "id, name, description, price, wholesale_price, category, image_url, is_available, is_popular, sort_order, ingredients",
    )
    .eq("is_available", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`menu: ${error.message}`);
  }

  return (data ?? []) as MenuItemRow[];
}

export async function fetchStoreLocationRows(): Promise<StoreLocationRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("store_locations")
    .select(
      "id, name, address, suburb, lat, lng, phone, hours, is_active, delivery_url",
    )
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`store_locations: ${error.message}`);
  }

  return (data ?? []) as StoreLocationRow[];
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

export async function fetchWholesaleProductRows(): Promise<WholesaleProductRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("wholesale_products")
    .select(
      "id, name, sku, category, description, unit, unit_price, stock_qty, is_available, min_order_qty, image_url, created_at, updated_at",
    )
    .eq("is_available", true)
    .order("category", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`wholesale_products: ${error.message}`);
  }

  return (data ?? []) as WholesaleProductRow[];
}
