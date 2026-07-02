import { unstable_cache } from "next/cache";
import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { sortCategoriesByDisplayOrder } from "@/lib/category-sort";
import type { SiteCategory, SiteCategoryGroup } from "@/types";
import { getCategoryGroups } from "@/lib/supabase/category-groups";
import { SERVER_CACHE_INSTANCE_ID } from "./cache-instance";
import { createServerSupabaseClient } from "./server";

const CACHE_TAG = CACHE_TAGS.categories;

export type CategoryCatalog = {
  categories: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
};

type CategoryRow = {
  id: number;
  kind: string;
  category_group_id: number | null;
  sort_order: number | null;
  alias: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  addon: string[] | null;
  style: string | null;
  icon: string | null;
  customization_ids: number[] | null;
};

function mapCategoryRow(row: CategoryRow): SiteCategory {
  return {
    id: Number(row.id),
    kind: row.kind,
    categoryGroupId:
      row.category_group_id != null ? Number(row.category_group_id) : null,
    sortOrder: Number(row.sort_order ?? 0),
    alias: row.alias,
    name: row.name,
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? null,
    addon: Array.isArray(row.addon)
      ? row.addon.map((value) => String(value))
      : [],
    style: row.style ?? null,
    icon: row.icon ?? null,
    customizationIds: Array.isArray(row.customization_ids)
      ? row.customization_ids.map((id) => Number(id))
      : [],
  };
}

async function loadCategories(): Promise<SiteCategory[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      'id, kind, category_group_id, sort_order, alias, name, description, "imageUrl", addon, style, icon, customization_ids',
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapCategoryRow(row as CategoryRow));
}

/**
 * Categories for menu/category metadata, loaded per menu page usage.
 */
export const getCategories = unstable_cache(
  loadCategories,
  [CACHE_TAG, SERVER_CACHE_INSTANCE_ID],
  {
    revalidate: SHORT_REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  },
);

export async function getCategoriesByKind(
  kind: string,
): Promise<SiteCategory[]> {
  const catalog = await getCategoryCatalogByKind(kind);
  return catalog.categories;
}

export async function getCategoryCatalogByKind(
  kind: string,
): Promise<CategoryCatalog> {
  const [categories, categoryGroups] = await Promise.all([
    getCategories(),
    getCategoryGroups(),
  ]);

  return {
    categories: sortCategoriesByDisplayOrder(
      categories.filter((category) => category.kind === kind),
    ),
    categoryGroups,
  };
}

export async function getRandomCategoriesByKind(
  kind: string,
  limit: number,
): Promise<SiteCategory[]> {
  const categories = await getCategories();

  return categories
    .filter((category) => category.kind === kind)
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);
}
