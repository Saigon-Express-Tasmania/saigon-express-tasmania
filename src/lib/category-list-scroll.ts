export const CATEGORY_LIST_ANCHOR = "category-list";

export function getCategorySectionId(categoryId: number): string {
  return `category-${categoryId}`;
}

export function scrollToCategoryInList(
  categoryId: number | null,
  listAnchorId: string = CATEGORY_LIST_ANCHOR,
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const targetId =
        categoryId == null
          ? listAnchorId
          : getCategorySectionId(categoryId);

      const element =
        document.getElementById(targetId) ??
        document.getElementById(listAnchorId);

      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}
