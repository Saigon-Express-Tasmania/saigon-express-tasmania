import { FEATURED_CATERING_PACK_CATEGORY, type CateringPack } from "@/lib/supabase/catering-packs";
import { categoryDisplaySortRank } from "@/lib/category-sort";
import type { SiteCategory } from "@/types";

export type CateringMenuGroup = {
  categoryId: number | null;
  category: string;
  items: CateringPack[];
  sortOrder: number;
};

export function buildCateringMenuGroups(
  packs: CateringPack[],
  categoriesContent: SiteCategory[],
): CateringMenuGroup[] {
  const categoryMeta = new Map(
    categoriesContent.map((category) => [
      category.id,
      { sortOrder: category.sortOrder, name: category.name },
    ]),
  );

  const groups = packs
    .filter(
      (pack) =>
        pack.isAvailable && pack.category !== FEATURED_CATERING_PACK_CATEGORY,
    )
    .reduce<Map<number, CateringMenuGroup>>((groupMap, item) => {
      const categoryIds =
        item.categoryIds.length > 0
          ? item.categoryIds
          : item.categoryId != null
            ? [item.categoryId]
            : [];

      for (const categoryId of categoryIds) {
        const meta = categoryMeta.get(categoryId);
        const existing = groupMap.get(categoryId);
        if (existing) {
          if (!existing.items.some((pack) => pack.id === item.id)) {
            existing.items.push(item);
          }
          existing.sortOrder = Math.min(existing.sortOrder, item.sortOrder);
          continue;
        }

        groupMap.set(categoryId, {
          categoryId,
          category: meta?.name ?? item.category,
          items: [item],
          sortOrder: meta?.sortOrder ?? item.sortOrder,
        });
      }

      return groupMap;
    }, new Map());

  return [...groups.values()]
    .filter((group) => group.items.length > 0)
    .sort((a, b) => {
      const aMeta =
        a.categoryId != null ? categoryMeta.get(a.categoryId) : undefined;
      const bMeta =
        b.categoryId != null ? categoryMeta.get(b.categoryId) : undefined;
      const aRank = aMeta
        ? categoryDisplaySortRank(aMeta.sortOrder)
        : Number.MAX_SAFE_INTEGER;
      const bRank = bMeta
        ? categoryDisplaySortRank(bMeta.sortOrder)
        : Number.MAX_SAFE_INTEGER;

      return (
        aRank - bRank ||
        (aMeta?.name ?? a.category).localeCompare(bMeta?.name ?? b.category) ||
        a.sortOrder - b.sortOrder ||
        a.category.localeCompare(b.category)
      );
    });
}
