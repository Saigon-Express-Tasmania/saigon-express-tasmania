import { DEFAULT_LOCALE } from "@/config/localize";
import type { MenuItem } from "@/contexts/CartContext";

export const MENU_CATEGORIES_ANCHOR = "categories";

export function parseNumericMenuItemId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id < 1 || String(id) !== raw.trim()) {
    return null;
  }
  return id;
}

export function menuItemDetailSegment(
  item: Pick<MenuItem, "slug" | "id">,
): string {
  const slug = item.slug?.trim();
  if (slug) return encodeURIComponent(slug);
  return String(item.id);
}

export function menuItemDetailPath(
  item: Pick<MenuItem, "slug" | "id">,
  locale: string,
): string {
  const segment = menuItemDetailSegment(item);
  return locale === DEFAULT_LOCALE
    ? `/menu/${segment}`
    : `/${locale}/menu/${segment}`;
}

export function menuListPath(
  locale: string,
  category?: string | null,
  anchor?: string,
): string {
  const base = locale === DEFAULT_LOCALE ? "/menu" : `/${locale}/menu`;
  const trimmed = category?.trim();
  let path = base;
  if (trimmed) {
    path = `${base}?category=${encodeURIComponent(trimmed)}`;
  }
  if (anchor) {
    path = `${path}#${anchor}`;
  }
  return path;
}
