import { stringToSlug } from "@/lib/utils";

export const CATEGORY_LIST_ANCHOR = "category-list";

export function getCategorySectionId(categoryName: string): string {
  return stringToSlug(categoryName);
}

export function scrollToCategoryInList(
  categoryName: string,
  allLabel: string,
  listAnchorId: string = CATEGORY_LIST_ANCHOR,
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const targetId =
        categoryName === allLabel
          ? listAnchorId
          : getCategorySectionId(categoryName);

      const element =
        document.getElementById(targetId) ??
        document.getElementById(listAnchorId);

      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}
