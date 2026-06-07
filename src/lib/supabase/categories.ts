import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import type { SiteCategory } from "@/types";
import { createServerSupabaseClient } from "./server";

const CACHE_TAG = CACHE_TAGS.categories;

type CategoryRow = {
  id: number;
  kind: string;
  alias: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  addon: string[] | null;
  style: string | null;
  icon: string | null;
};

function mapCategoryRow(row: CategoryRow): SiteCategory {
  return {
    id: Number(row.id),
    kind: row.kind,
    alias: row.alias,
    name: row.name,
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? null,
    addon: Array.isArray(row.addon) ? row.addon.map((value) => String(value)) : [],
    style: row.style ?? null,
    icon: row.icon ?? null,
  };
}

async function loadCategories(): Promise<SiteCategory[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select('id, kind, alias, name, description, "imageUrl", addon, style, icon')
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

export async function getCategoriesByKind(kind: string): Promise<SiteCategory[]> {
  const categories = await getCategories();
  return categories.filter((category) => category.kind === kind);
}