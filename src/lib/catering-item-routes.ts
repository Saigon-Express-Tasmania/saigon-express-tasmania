import { DEFAULT_LOCALE } from "@/config/localize";
import type { CateringPack } from "@/lib/supabase/catering-packs";

export function parseNumericCateringItemId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id < 1 || String(id) !== raw.trim()) {
    return null;
  }
  return id;
}

export function cateringItemDetailPath(
  item: Pick<CateringPack, "id">,
  locale: string,
): string {
  const segment = String(item.id);
  return locale === DEFAULT_LOCALE
    ? `/catering/${segment}`
    : `/${locale}/catering/${segment}`;
}

export function cateringListPath(
  locale: string,
  category?: string | null,
): string {
  const base =
    locale === DEFAULT_LOCALE ? "/catering" : `/${locale}/catering`;
  const trimmed = category?.trim();
  if (trimmed) {
    return `${base}?category=${encodeURIComponent(trimmed)}`;
  }
  return base;
}
