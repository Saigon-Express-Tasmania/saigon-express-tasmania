import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/config/localize";

export function stripLocalePrefix(pathname: string): string {
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const prefix = `/${locale}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || "/";
    }
  }
  return pathname;
}

export function normalizePathname(pathname: string): string {
  return stripLocalePrefix(pathname.replace(/\/$/, "") || "/");
}

/** Public catering shop: list page and product detail pages. */
export function isPublicCateringShopRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return path === "/catering" || path.startsWith("/catering/");
}

/** Routes where the catering cart should be active in the header. */
export function isCateringCartRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return (
    isPublicCateringShopRoute(pathname) ||
    path === "/member/catering-shop" ||
    path === "/member/catering-orders"
  );
}
