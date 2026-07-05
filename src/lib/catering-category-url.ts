import type { SiteCategory } from "@/types";

export function cateringCategoryUrlParam(
  categories: Pick<SiteCategory, "id" | "alias" | "name">[],
  categoryName: string,
): string | null {
  const match = categories.find((category) => category.name === categoryName);
  return match?.alias ?? null;
}

export function resolveCateringCategoryFromUrlParam(
  param: string | null | undefined,
  categories: Pick<SiteCategory, "id" | "alias" | "name">[],
): Pick<SiteCategory, "id" | "alias" | "name"> | null {
  const trimmed = param?.trim();
  if (!trimmed) return null;

  const byAlias = categories.find((category) => category.alias === trimmed);
  if (byAlias) return byAlias;

  return categories.find((category) => category.name === trimmed) ?? null;
}

export function buildCateringCategoryQuery(
  categoryName: string,
  allLabel: string,
  categories: Pick<SiteCategory, "id" | "alias" | "name">[],
): string {
  if (categoryName === allLabel) return "";

  const alias = cateringCategoryUrlParam(categories, categoryName);
  if (!alias) return "";

  const params = new URLSearchParams();
  params.set("category", alias);
  return params.toString();
}

export function buildCateringCategoryQueryFromId(
  categoryId: number | null,
  categories: Pick<SiteCategory, "id" | "alias">[],
): string {
  if (categoryId == null) return "";

  const alias = categories.find((category) => category.id === categoryId)?.alias;
  if (!alias) return "";

  const params = new URLSearchParams();
  params.set("category", alias);
  return params.toString();
}
