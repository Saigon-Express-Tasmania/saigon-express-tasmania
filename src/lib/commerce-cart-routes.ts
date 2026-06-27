import { isCateringCartRoute, normalizePathname } from "@/lib/catering-routes";

export { isCateringCartRoute } from "@/lib/catering-routes";

/** Routes where the wholesale B2B cart UI may be opened. */
export function isWholesaleCartRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return (
    path === "/wholesale/shop" ||
    path === "/wholesale/orders" ||
    path === "/wholesale/landing-shop" ||
    path === "/member/dashboard"
  );
}
