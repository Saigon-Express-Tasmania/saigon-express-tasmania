import { DEFAULT_LOCALE } from "@/config/localize";
import type { MenuItem } from "@/contexts/CartContext";

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
