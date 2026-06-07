import { SUPPORTED_LOCALES } from "@/config/localize";

const HEADERLESS_PATHS = new Set(["/wholesale/dashboard"]);

export function shouldHideMainHeader(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  if (HEADERLESS_PATHS.has(path)) return true;

  for (const locale of SUPPORTED_LOCALES) {
    if (path.endsWith('/wholesale/dashboard') || path.endsWith('/wholesale/orders') || path.endsWith('/wholesale/profile')) return true;
  }

  return false;
}
