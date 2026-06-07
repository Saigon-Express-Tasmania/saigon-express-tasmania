"use client";

import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/config/localize";
import { LOGO_IMG_CLASS, LOGO_INTRINSIC, LOGO_URL } from "@/lib/site-images";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useSupabase } from "@/hooks/useSupabase";
import { Loader2, LogOut, ShoppingCart } from "lucide-react";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Dashboard", href: "/wholesale/dashboard" },
  { label: "Orders", href: "/wholesale/orders" },
  { label: "My Profile", href: "/wholesale/profile" },
] as const;

export type WholesaleHeaderMember = {
  businessName: string;
  portalType: string;
};

type WholesaleHeaderProps = {
  member?: WholesaleHeaderMember | null;
  onLogout: () => void;
  showCart?: boolean;
};

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

function isActiveNav(pathname: string, href: string): boolean {
  const path = stripLocalePrefix(pathname.replace(/\/$/, "") || "/");
  const target = href.replace(/\/$/, "");
  return path === target;
}

export default function WholesaleHeader({
  member,
  onLogout,
  showCart = true,
}: WholesaleHeaderProps) {
  const pathname = usePathname();
  const { isLoading: isAccountLoading } = useSupabase();
  const { cartCount, setCartOpen, isHydrated } = useWholesaleCart();
  const isCartLoading = !isHydrated;
  const showCartSpinner = isAccountLoading || isCartLoading;

  return (
    <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10">
      <div className="container flex items-center justify-between gap-4 h-16">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/" className="shrink-0">
            <AppImage
              src={LOGO_URL}
              alt="Saigon Express"
              width={LOGO_INTRINSIC.width}
              height={LOGO_INTRINSIC.height}
              className={`h-9 ${LOGO_IMG_CLASS}`}
            />
          </Link>
          <nav className="hidden md:flex items-center gap-1 min-w-0">
            {NAV_LINKS.map((link) => {
              const active = isActiveNav(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? "bg-primary/20 text-primary"
                      : "text-white/55 hover:text-white hover:bg-white/8"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {member ? (
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-white">
                {member.businessName}
              </div>
              <div className="text-xs text-white/40 capitalize">
                {member.portalType} member
              </div>
            </div>
          ) : null}
          {showCart ? (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              disabled={showCartSpinner}
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors disabled:opacity-70 disabled:pointer-events-none"
            >
              {showCartSpinner ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">Cart</span>
              {!showCartSpinner && cartCount > 0 ? (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              ) : null}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-white/40 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
