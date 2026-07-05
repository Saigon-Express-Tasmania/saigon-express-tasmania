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
  items: readonly { categoryId?: number | null; categoryIds?: number[] }[],
): Set<number> {
  const ids = new Set<number>();
  for (const item of items) {
    if (item.categoryIds?.length) {
      for (const categoryId of item.categoryIds) {
        ids.add(categoryId);
      }
      continue;
    }
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

export function getActiveCategoryLabel(
  activeCategoryId: number | null,
  allLabel: string,
  categories: Pick<SiteCategory, "id" | "name">[],
): string {
  if (activeCategoryId == null) return allLabel;
  return (
    categories.find((category) => category.id === activeCategoryId)?.name ??
    allLabel
  );
}

export function isCategoryActiveInBarItem(
  item: CategoryBarItem,
  activeCategoryId: number | null,
): boolean {
  if (activeCategoryId == null) return false;
  if (item.kind === "orphan") {
    return item.category.id === activeCategoryId;
  }
  return item.categories.some(
    (category) => category.id === activeCategoryId,
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

export type CategorySidebarGroupAccent = {
  label: string;
  bar: string;
  header: string;
  headerActive: string;
  itemHover: string;
};

const CATEGORY_SIDEBAR_GROUP_ACCENTS: CategorySidebarGroupAccent[] = [
  {
    label: "text-violet-700",
    bar: "bg-gradient-to-b from-violet-500 to-fuchsia-500",
    header: "hover:bg-violet-50/90",
    headerActive: "bg-violet-50 text-violet-800",
    itemHover: "hover:bg-violet-50/60",
  },
  {
    label: "text-sky-700",
    bar: "bg-gradient-to-b from-sky-500 to-cyan-500",
    header: "hover:bg-sky-50/90",
    headerActive: "bg-sky-50 text-sky-800",
    itemHover: "hover:bg-sky-50/60",
  },
  {
    label: "text-amber-800",
    bar: "bg-gradient-to-b from-amber-500 to-orange-500",
    header: "hover:bg-amber-50/90",
    headerActive: "bg-amber-50 text-amber-900",
    itemHover: "hover:bg-amber-50/60",
  },
  {
    label: "text-emerald-700",
    bar: "bg-gradient-to-b from-emerald-500 to-green-500",
    header: "hover:bg-emerald-50/90",
    headerActive: "bg-emerald-50 text-emerald-800",
    itemHover: "hover:bg-emerald-50/60",
  },
  {
    label: "text-indigo-700",
    bar: "bg-gradient-to-b from-indigo-500 to-blue-500",
    header: "hover:bg-indigo-50/90",
    headerActive: "bg-indigo-50 text-indigo-800",
    itemHover: "hover:bg-indigo-50/60",
  },
  {
    label: "text-rose-700",
    bar: "bg-gradient-to-b from-rose-500 to-pink-500",
    header: "hover:bg-rose-50/90",
    headerActive: "bg-rose-50 text-rose-800",
    itemHover: "hover:bg-rose-50/60",
  },
];

export function categorySidebarGroupAccent(index: number): CategorySidebarGroupAccent {
  return CATEGORY_SIDEBAR_GROUP_ACCENTS[
    index % CATEGORY_SIDEBAR_GROUP_ACCENTS.length
  ];
}

export function getCategorySidebarShellClass(
  variant: CategoryNavVariant,
): string {
  // if (variant === "member") {
  //   return "border-r border-gray-100 bg-gradient-to-b from-white via-white to-gray-50/90 px-3 py-3 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.1)]";
  // }

  // if (variant === "wholesale") {
  //   return "border-r border-border bg-gradient-to-b from-background via-background to-muted/25 px-3 py-3 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.08)]";
  // }

  return "border-r border-gray-100/90 bg-gradient-to-b from-white via-white to-brand-cream/50 px-3 py-3 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.1)] h-screen overflow-hidden";
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
