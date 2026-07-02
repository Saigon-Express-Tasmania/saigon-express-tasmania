import {
  categoryDisplaySortRank,
  sortCategoriesByDisplayOrder,
} from "@/lib/category-sort";
import type { SiteCategory, SiteCategoryGroup } from "@/types";

export type CategoryBarGroupItem = {
  kind: "group";
  id: number;
  name: string;
  sortOrder: number;
  categories: SiteCategory[];
};

export type CategoryBarOrphanItem = {
  kind: "orphan";
  category: SiteCategory;
  sortOrder: number;
};

export type CategoryBarItem = CategoryBarGroupItem | CategoryBarOrphanItem;

export function getCategoryBarItemName(item: CategoryBarItem): string {
  return item.kind === "group" ? item.name : item.category.name;
}

export function getPopulatedCategoryIds(
  items: readonly { categoryId?: number | null }[],
): Set<number> {
  const ids = new Set<number>();
  for (const item of items) {
    if (item.categoryId != null) {
      ids.add(item.categoryId);
    }
  }
  return ids;
}

export function filterCategoriesWithItems(
  categories: SiteCategory[],
  populatedCategoryIds: ReadonlySet<number>,
): SiteCategory[] {
  return categories.filter((category) => populatedCategoryIds.has(category.id));
}

export function buildCategoryBarItems(
  categories: SiteCategory[],
  categoryGroups: SiteCategoryGroup[],
): CategoryBarItem[] {
  const sortedCategories = sortCategoriesByDisplayOrder(categories);
  const groupsById = new Map(categoryGroups.map((group) => [group.id, group]));
  const categoriesByGroupId = new Map<number, SiteCategory[]>();
  const orphans: SiteCategory[] = [];

  for (const category of sortedCategories) {
    const groupId = category.categoryGroupId;
    if (groupId != null && groupsById.has(groupId)) {
      const existing = categoriesByGroupId.get(groupId) ?? [];
      existing.push(category);
      categoriesByGroupId.set(groupId, existing);
    } else {
      orphans.push(category);
    }
  }

  const items: CategoryBarItem[] = [];
  const orphanCategories: SiteCategory[] = [...orphans];

  for (const group of sortCategoriesByDisplayOrder(categoryGroups)) {
    const groupedCategories = categoriesByGroupId.get(group.id);
    if (!groupedCategories?.length) continue;

    const sortedGroupedCategories =
      sortCategoriesByDisplayOrder(groupedCategories);

    if (sortedGroupedCategories.length === 1) {
      orphanCategories.push(sortedGroupedCategories[0]);
      continue;
    }

    items.push({
      kind: "group",
      id: group.id,
      name: group.name,
      sortOrder: group.sortOrder,
      categories: sortedGroupedCategories,
    });
  }

  for (const category of orphanCategories) {
    items.push({
      kind: "orphan",
      category,
      sortOrder: category.sortOrder,
    });
  }

  return items.sort((a, b) => {
    const rankDiff =
      categoryDisplaySortRank(a.sortOrder) -
      categoryDisplaySortRank(b.sortOrder);
    if (rankDiff !== 0) return rankDiff;
    return getCategoryBarItemName(a).localeCompare(getCategoryBarItemName(b));
  });
}

export function isCategoryActiveInBarItem(
  item: CategoryBarItem,
  activeCategoryName: string,
): boolean {
  if (item.kind === "orphan") {
    return item.category.name === activeCategoryName;
  }
  return item.categories.some(
    (category) => category.name === activeCategoryName,
  );
}

export const CATEGORY_GROUP_BAR_ACCENTS = [
  "from-violet-600 via-fuchsia-600 to-rose-500",
  "from-sky-600 via-cyan-600 to-teal-500",
  "from-amber-500 via-orange-500 to-red-500",
  "from-emerald-600 via-green-600 to-lime-500",
  "from-indigo-600 via-blue-600 to-sky-500",
  "from-rose-600 via-pink-600 to-fuchsia-500",
] as const;

export function categoryGroupBarAccent(index: number): string {
  return CATEGORY_GROUP_BAR_ACCENTS[
    index % CATEGORY_GROUP_BAR_ACCENTS.length
  ];
}
