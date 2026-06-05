import type { MenuItem } from "@/contexts/CartContext";

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

/** Row shape from `public.menu` (snake_case). */
export type MenuItemRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  wholesale_price: string | null;
  category: string;
  image_urls: MenuImageUrls;
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
  ingredients: unknown;
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

export function mapMenuItemRow(row: MenuItemRow): MenuItem {
  const imageUrls = normalizeMenuImageUrls(row.image_urls);
  const moreImages = parseMenuImageMore(row.image_urls);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug?.trim() ?? "",
    category: row.category,
    price: row.price,
    description: row.description,
    isAvailable: row.is_available,
    imageUrls,
    moreImages,
    imageUrl: pickMenuImageUrl(imageUrls),
    sortOrder: row.sort_order,
    isPopular: row.is_popular,
  };
}
