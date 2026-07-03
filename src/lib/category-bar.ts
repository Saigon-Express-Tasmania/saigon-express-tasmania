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

  const orphanItems: CategoryBarOrphanItem[] = orphanCategories.map(
    (category) => ({
      kind: "orphan",
      category,
      sortOrder: category.sortOrder,
    }),
  );

  const sortBarItems = (barItems: CategoryBarItem[]) =>
    [...barItems].sort((a, b) => {
      const rankDiff =
        categoryDisplaySortRank(a.sortOrder) -
        categoryDisplaySortRank(b.sortOrder);
      if (rankDiff !== 0) return rankDiff;
      return getCategoryBarItemName(a).localeCompare(getCategoryBarItemName(b));
    });

  return [...sortBarItems(orphanItems), ...sortBarItems(items)];
}

export function getCategoriesInSidebarOrder(
  categories: SiteCategory[],
  categoryGroups: SiteCategoryGroup[],
): SiteCategory[] {
  const barItems = buildCategoryBarItems(categories, categoryGroups);
  const ordered: SiteCategory[] = [];

  for (const item of barItems) {
    if (item.kind === "orphan") {
      ordered.push(item.category);
    } else {
      ordered.push(...item.categories);
    }
  }

  return ordered;
}

export function sortGroupsByCategoryBarOrder<T extends { categoryId: number | null }>(
  groups: T[],
  categories: SiteCategory[],
  categoryGroups: SiteCategoryGroup[],
): T[] {
  const rankById = new Map(
    getCategoriesInSidebarOrder(categories, categoryGroups).map(
      (category, index) => [category.id, index],
    ),
  );

  return [...groups].sort((a, b) => {
    const aRank =
      a.categoryId != null
        ? (rankById.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;
    const bRank =
      b.categoryId != null
        ? (rankById.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;

    if (aRank !== bRank) return aRank - bRank;
    return 0;
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

export type CategoryNavVariant = "brand" | "member" | "wholesale";

export type CategoryNavVariantStyles = {
  label: string;
  itemSelected: string;
  itemIdle: string;
  groupActive: string;
  groupIdle: string;
  check: string;
  triggerHover: string;
  triggerFocus: string;
  triggerOpen: string;
  triggerText: string;
  triggerChevron: string;
  commandText: string;
  commandPlaceholder: string;
  commandEmpty: string;
  optionItem: string;
  groupHeading: string;
};

export function getCategoryNavVariantStyles(
  variant: CategoryNavVariant,
): CategoryNavVariantStyles {
  if (variant === "member") {
    return {
      label: "text-gray-500",
      itemSelected: "bg-primary/10 font-semibold text-primary",
      itemIdle: "text-gray-700 hover:bg-primary/5 hover:text-gray-900",
      groupActive: "text-primary",
      groupIdle: "text-gray-500",
      check: "text-primary",
      triggerHover: "hover:border-primary/30",
      triggerFocus:
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
      triggerOpen: "border-primary/40 ring-2 ring-primary/15",
      triggerText: "text-gray-900",
      triggerChevron: "text-gray-400",
      commandText: "text-gray-900",
      commandPlaceholder: "placeholder:text-gray-400",
      commandEmpty: "text-gray-400",
      optionItem:
        "text-gray-900 aria-selected:bg-primary/5 data-[selected=true]:bg-primary/5",
      groupHeading: "text-gray-500",
    };
  }

  if (variant === "wholesale") {
    return {
      label: "text-muted-foreground",
      itemSelected: "bg-primary/10 font-semibold text-primary",
      itemIdle: "text-foreground/80 hover:bg-primary/5 hover:text-foreground",
      groupActive: "text-primary",
      groupIdle: "text-muted-foreground",
      check: "text-primary",
      triggerHover: "hover:border-primary/30",
      triggerFocus:
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
      triggerOpen: "border-primary/40 ring-2 ring-primary/15",
      triggerText: "text-foreground",
      triggerChevron: "text-muted-foreground",
      commandText: "text-foreground",
      commandPlaceholder: "placeholder:text-muted-foreground",
      commandEmpty: "text-muted-foreground",
      optionItem:
        "text-foreground aria-selected:bg-primary/5 data-[selected=true]:bg-primary/5",
      groupHeading: "text-muted-foreground",
    };
  }

  return {
    label: "text-brand-dark/60",
    itemSelected: "bg-brand-red/10 font-semibold text-brand-red",
    itemIdle: "text-brand-dark/80 hover:bg-brand-red/5 hover:text-brand-dark",
    groupActive: "text-brand-red",
    groupIdle: "text-brand-dark/50",
    check: "text-brand-red",
    triggerHover: "hover:border-brand-red/30",
    triggerFocus:
      "focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20",
    triggerOpen: "border-brand-red/40 ring-2 ring-brand-red/15",
    triggerText: "text-brand-dark",
    triggerChevron: "text-brand-dark/40",
    commandText: "text-brand-dark",
    commandPlaceholder: "placeholder:text-brand-dark/40",
    commandEmpty: "text-brand-dark/45",
    optionItem:
      "text-brand-dark aria-selected:bg-brand-red/5 data-[selected=true]:bg-brand-red/5",
    groupHeading: "text-brand-dark/45",
  };
}
