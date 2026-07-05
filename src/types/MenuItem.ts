import type { MenuItem } from "@/contexts/CartContext";
import type { CategoryLookup } from "@/lib/product-category";
import type { ProductCategoryAssignment } from "@/lib/product-categories";
import {
  getPrimaryCategoryId,
  resolveProductCategoryIds,
  resolveProductCategoryLabel,
} from "@/lib/product-categories";
import { parseFoodContent, type FoodContent } from "@/types/FoodContent";

/** Size key → image URL (e.g. `"512"` → `https://...`). */
export type MenuImageUrls = Record<string, string>;

/** Additional gallery entry in `image_urls.more`. */
export type MenuImageMoreEntry = {
  sm: string;
  lg: string;
};

function isMenuImageMoreEntry(value: unknown): value is MenuImageMoreEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return Boolean(String(row.sm ?? "").trim() && String(row.lg ?? "").trim());
}

export function parseMenuImageMore(value: unknown): MenuImageMoreEntry[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const more = (value as Record<string, unknown>).more;
  if (!Array.isArray(more)) return [];
  return more
    .filter(isMenuImageMoreEntry)
    .map((row) => ({
      sm: String(row.sm).trim(),
      lg: String(row.lg).trim(),
    }));
}

export type MenuItemNutritionalInformation = {
  label: string;
  perServing: string;
  perPortion: string;
  servingSize: string;
  portionSize: string;
}

export type MenuItemIngredient = {
  nutritionalInformation: Record<string, MenuItemNutritionalInformation>;
  contents: string;
  foodHistory: string;
  allergens: string;
  storageInstructions: string;
  preparationInstructions: string;
  cookingInstructions: string;
  servingInstructions: string;
  servingSize: string;
  portionSize: string;
};

export function emptyMenuItemIngredient(): MenuItemIngredient {
  return {
    nutritionalInformation: {},
    contents: "",
    foodHistory: "",
    allergens: "",
    storageInstructions: "",
    preparationInstructions: "",
    cookingInstructions: "",
    servingInstructions: "",
    servingSize: "",
    portionSize: "",
  };
}

export function parseMenuItemIngredient(value: unknown): MenuItemIngredient {
  const empty = emptyMenuItemIngredient();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return empty;
  }

  const row = value as Record<string, unknown>;
  const nutritionalInformation: Record<string, MenuItemNutritionalInformation> =
    {};

  const rawNutrition = row.nutritionalInformation;
  if (
    rawNutrition &&
    typeof rawNutrition === "object" &&
    !Array.isArray(rawNutrition)
  ) {
    for (const [key, entry] of Object.entries(rawNutrition)) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const nutrient = entry as Record<string, unknown>;
      nutritionalInformation[key] = {
        label: String(nutrient.label ?? ""),
        perServing: String(nutrient.perServing ?? ""),
        perPortion: String(nutrient.perPortion ?? ""),
        servingSize: String(nutrient.servingSize ?? ""),
        portionSize: String(nutrient.portionSize ?? ""),
      };
    }
  }

  return {
    nutritionalInformation,
    contents: String(row.contents ?? ""),
    foodHistory: String(row.foodHistory ?? ""),
    allergens: String(row.allergens ?? ""),
    storageInstructions: String(row.storageInstructions ?? ""),
    preparationInstructions: String(row.preparationInstructions ?? ""),
    cookingInstructions: String(row.cookingInstructions ?? ""),
    servingInstructions: String(row.servingInstructions ?? ""),
    servingSize: String(row.servingSize ?? ""),
    portionSize: String(row.portionSize ?? ""),
  };
}

export function isMenuItemIngredientEmpty(
  ingredients: MenuItemIngredient,
): boolean {
  if (Object.keys(ingredients.nutritionalInformation).length > 0) return false;
  return !(
    ingredients.contents.trim() ||
    ingredients.foodHistory.trim() ||
    ingredients.allergens.trim() ||
    ingredients.storageInstructions.trim() ||
    ingredients.preparationInstructions.trim() ||
    ingredients.cookingInstructions.trim() ||
    ingredients.servingInstructions.trim() ||
    ingredients.servingSize.trim() ||
    ingredients.portionSize.trim()
  );
}

/** Row shape from `public.products` where product_type = alacarte (snake_case). */
export type MenuItemRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  wholesale_price: string | null;
  image_urls: MenuImageUrls;
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
  ingredients: unknown;
  energy: number;
  food_content: unknown;
  customization_ids?: number[] | null;
  customizations_disabled?: boolean | null;
};

export function normalizeMenuImageUrls(value: unknown): MenuImageUrls {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.entries(value as Record<string, unknown>).reduce<MenuImageUrls>(
    (acc, [key, url]) => {
      if (key === "more" || !/^\d+$/.test(key)) return acc;
      const trimmed = String(url ?? "").trim();
      if (trimmed) acc[key] = trimmed;
      return acc;
    },
    {},
  );
}

export function pickMenuImageUrl(
  urls: MenuImageUrls | null | undefined,
  preferredSizes: number[] = [512, 1024, 1920, 256],
): string | null {
  const map = urls ?? {};
  for (const size of preferredSizes) {
    const url = map[String(size)]?.trim();
    if (url) return url;
  }
  const fallback = Object.values(map).find((url) => url?.trim());
  return fallback?.trim() ?? null;
}

export function mapMenuItemRow(
  row: MenuItemRow,
  assignments: ProductCategoryAssignment[],
  categoryById: Map<number, CategoryLookup> = new Map(),
): MenuItem {
  const imageUrls = normalizeMenuImageUrls(row.image_urls);
  const moreImages = parseMenuImageMore(row.image_urls);
  const categoryIds = resolveProductCategoryIds(assignments);
  const categoryId = getPrimaryCategoryId(assignments);
  const category = resolveProductCategoryLabel(assignments, categoryById);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug?.trim() ?? "",
    categoryId,
    categoryIds,
    category,
    price: row.price,
    description: row.description,
    isAvailable: row.is_available,
    imageUrls,
    moreImages,
    imageUrl: pickMenuImageUrl(imageUrls),
    sortOrder: row.sort_order,
    isPopular: row.is_popular,
    ingredients: parseMenuItemIngredient(row.ingredients),
    energy: row.energy ?? 0,
    foodContent: parseFoodContent(row.food_content),
    customizationIds: Array.isArray(row.customization_ids)
      ? row.customization_ids.map((id) => Number(id))
      : [],
    customizationsDisabled: Boolean(row.customizations_disabled),
  };
}
