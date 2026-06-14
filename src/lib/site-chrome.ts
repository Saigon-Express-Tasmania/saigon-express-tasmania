import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/config/localize";

/** Site sections that use MemberHeader instead of MainHeader. */
const HEADERLESS_SECTIONS = ["/wholesale", "/member", "/warehouse", "/franchise", "/order-tracking"] as const;

function stripLocalePrefix(pathname: string): string {
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const prefix = `/${locale}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || "/";
    }
  }
  return pathname;
}

function matchesSectionWildcard(path: string, section: string): boolean {
  if (path.endsWith("/landing-shop")) {
    return false;
  }
  if (path === "/wholesale") {
    return false;
  }
  return path.startsWith(`${section}/`);
}

export function shouldHideMainHeader(pathname: string): boolean {
  const path = stripLocalePrefix(pathname.replace(/\/$/, "") || "/");
  return HEADERLESS_SECTIONS.some((section) =>
    matchesSectionWildcard(path, section),
  );
}
