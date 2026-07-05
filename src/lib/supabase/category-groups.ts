import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import type { SiteCategoryGroup } from "@/types";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { createServerSupabaseClient } from "./server";

const CACHE_TAG = CACHE_TAGS.categoryGroups;

type CategoryGroupRow = {
  id: number;
  kind: string;
  name: string;
  alias: string;
  description: string | null;
  imageUrl: string | null;
  sort_order: number | null;
};

function mapCategoryGroupRow(row: CategoryGroupRow): SiteCategoryGroup {
  return {
    id: Number(row.id),
    kind: row.kind,
    name: row.name,
    alias: row.alias,
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? null,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

async function loadCategoryGroups(): Promise<SiteCategoryGroup[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("category_groups")
    .select('id, kind, name, alias, description, "imageUrl", sort_order')
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapCategoryGroupRow(row as CategoryGroupRow));
}

export const getCategoryGroups = unstable_cache(
  loadCategoryGroups,
  [CACHE_TAG, SERVER_CACHE_INSTANCE_ID],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  },
);
