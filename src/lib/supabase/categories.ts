import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import type { SiteCategory } from "@/types";
import { createServerSupabaseClient } from "./server";

const CACHE_TAG = CACHE_TAGS.categories;

type CategoryRow = {
  id: number;
  alias: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  addon: string[] | null;
};

function mapCategoryRow(row: CategoryRow): SiteCategory {
  return {
    id: Number(row.id),
    alias: row.alias,
    name: row.name,
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? null,
    addon: Array.isArray(row.addon) ? row.addon.map((value) => String(value)) : [],
  };
}

async function loadCategories(): Promise<SiteCategory[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select('id, alias, name, description, "imageUrl", addon')
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapCategoryRow(row as CategoryRow));
}

/**
 * Categories for menu/category metadata, loaded per menu page usage.
 */
export const getCategories = unstable_cache(loadCategories, [CACHE_TAG], {
  revalidate: SHORT_REVALIDATE_SECONDS,
  tags: [CACHE_TAG],
});
