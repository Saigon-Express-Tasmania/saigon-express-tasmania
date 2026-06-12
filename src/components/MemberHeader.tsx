"use client";

import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/config/localize";
import { LOGO_IMG_CLASS, LOGO_INTRINSIC, LOGO_URL } from "@/lib/site-images";
import { hasPrivilege } from "@/lib/privileges";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useSupabase } from "@/hooks/useSupabase";
import MemberPrivilegeBadges from "@/components/MemberPrivilegeBadges";
import { ChevronDown, Loader2, LogOut, Menu, ShoppingCart, X } from "lucide-react";
import type { BusinessType } from "@/types/UserProfile";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const HOME_LINK = {
  label: "Home",
  href: "/",
} as const;

const MEMBER_ACCOUNT_LINK = {
  label: "My Account",
  href: "/member",
} as const;

const DASHBOARD_LINK = {
  label: "Dashboard",
  href: "/member/dashboard",
} as const;

const PROFILE_LINK = {
  label: "My Profile",
  href: "/member/profile",
} as const;

const WHOLESALE_NAV_LINKS = [
  { label: "Shop", href: "/wholesale/shop" },
  { label: "Orders", href: "/wholesale/orders" },
] as const;

export type MemberHeaderMember = {
  businessName: string;
  privileges: BusinessType[];
  avatarUrl?: string | null;
};

type MemberHeaderProps = {
  member?: MemberHeaderMember | null;
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

function isWholesaleNavActive(pathname: string): boolean {
  return WHOLESALE_NAV_LINKS.some((link) => isActiveNav(pathname, link.href));
}

function navLinkClass(active: boolean): string {
  return `px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
    active
      ? "bg-primary/20 text-primary"
      : "text-white/55 hover:text-white hover:bg-white/8"
  }`;
}

function MemberInfo({ member }: { member: MemberHeaderMember }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 text-left md:flex-none md:text-right">
        <div className="text-xs font-semibold text-white">
          {member.businessName}
        </div>
        <MemberPrivilegeBadges
          privileges={member.privileges}
          className="mt-0.5 md:justify-end"
        />
      </div>
      {member.avatarUrl ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-white/15 bg-white/5">
          <AppImage
            src={member.avatarUrl}
            alt={member.businessName}
            width={36}
            height={36}
            className="h-full w-full object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}

function CartButton({
  showCartSpinner,
  cartCount,
  onOpenCart,
  className = "",
}: {
  showCartSpinner: boolean;
  cartCount: number;
  onOpenCart: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpenCart}
      disabled={showCartSpinner}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors disabled:opacity-70 disabled:pointer-events-none ${className}`}
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
  );
}

export default function MemberHeader({
  member,
  onLogout,
  showCart = true,
}: MemberHeaderProps) {
  const pathname = usePathname();
  const { isLoading: isAccountLoading, isSignedIn } = useSupabase();
  const { cartCount, setCartOpen, isHydrated } = useWholesaleCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wholesaleMenuOpen, setWholesaleMenuOpen] = useState(false);

  const isCartLoading = !isHydrated;
  const showCartSpinner = isAccountLoading || isCartLoading;
  const hasWholesalePrivilege = member
    ? hasPrivilege(member.privileges, "wholesale")
    : false;
  const homeActive = isActiveNav(pathname, HOME_LINK.href);
  const memberAccountActive = isActiveNav(pathname, MEMBER_ACCOUNT_LINK.href);
  const dashboardActive = isActiveNav(pathname, DASHBOARD_LINK.href);
  const profileActive = isActiveNav(pathname, PROFILE_LINK.href);
  const wholesaleNavActive = isWholesaleNavActive(pathname);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10">
        <div className="container flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href={isSignedIn ? DASHBOARD_LINK.href : HOME_LINK.href}
              className="shrink-0"
            >
              <AppImage
                src={LOGO_URL}
                alt="Saigon Express"
                width={LOGO_INTRINSIC.width}
                height={LOGO_INTRINSIC.height}
                className={`h-9 ${LOGO_IMG_CLASS}`}
              />
            </Link>
            <nav className="hidden md:flex items-center gap-1 min-w-0">
              {isSignedIn ? (
                <>
                  <Link
                    href={DASHBOARD_LINK.href}
                    className={navLinkClass(dashboardActive)}
                  >
                    {DASHBOARD_LINK.label}
                  </Link>
                  {hasWholesalePrivilege ? (
                    <Popover
                      open={wholesaleMenuOpen}
                      onOpenChange={setWholesaleMenuOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 ${navLinkClass(wholesaleNavActive)}`}
                        >
                          Wholesale
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${wholesaleMenuOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-44 border-white/10 bg-black/95 p-1 text-white shadow-xl backdrop-blur-md"
                      >
                        {WHOLESALE_NAV_LINKS.map((link) => {
                          const active = isActiveNav(pathname, link.href);
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setWholesaleMenuOpen(false)}
                              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                active
                                  ? "bg-primary/20 text-primary"
                                  : "text-white/70 hover:bg-white/8 hover:text-white"
                              }`}
                            >
                              {link.label}
                            </Link>
                          );
                        })}
                      </PopoverContent>
                    </Popover>
                  ) : null}
                  <Link
                    href={PROFILE_LINK.href}
                    className={navLinkClass(profileActive)}
                  >
                    {PROFILE_LINK.label}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={HOME_LINK.href}
                    className={navLinkClass(homeActive)}
                  >
                    {HOME_LINK.label}
                  </Link>
                  <Link
                    href={MEMBER_ACCOUNT_LINK.href}
                    className={navLinkClass(memberAccountActive)}
                  >
                    {MEMBER_ACCOUNT_LINK.label}
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {member ? (
              <div className="hidden md:flex items-center gap-3">
                <MemberInfo member={member} />
              </div>
            ) : null}
            {showCart ? (
              <CartButton
                showCartSpinner={showCartSpinner}
                cartCount={cartCount}
                onOpenCart={() => setCartOpen(true)}
              />
            ) : null}
            {isSignedIn ? (
              <button
                type="button"
                onClick={onLogout}
                className="hidden md:block p-2 text-white/40 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : null}
            <button
              type="button"
              className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={closeMobileMenu}
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col border-l border-white/10 bg-black/95 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-2 text-white/60 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {member ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <MemberInfo member={member} />
                </div>
              ) : null}

              <nav className="space-y-1">
                {isSignedIn ? (
                  <>
                    <Link
                      href={DASHBOARD_LINK.href}
                      onClick={closeMobileMenu}
                      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        dashboardActive
                          ? "bg-primary/20 text-primary"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      {DASHBOARD_LINK.label}
                    </Link>
                    {hasWholesalePrivilege ? (
                      <div className="space-y-1">
                        <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                          Wholesale
                        </div>
                        {WHOLESALE_NAV_LINKS.map((link) => {
                          const active = isActiveNav(pathname, link.href);
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={closeMobileMenu}
                              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                active
                                  ? "bg-primary/20 text-primary"
                                  : "text-white/70 hover:bg-white/8 hover:text-white"
                              }`}
                            >
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                    <Link
                      href={PROFILE_LINK.href}
                      onClick={closeMobileMenu}
                      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        profileActive
                          ? "bg-primary/20 text-primary"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      {PROFILE_LINK.label}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={HOME_LINK.href}
                      onClick={closeMobileMenu}
                      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        homeActive
                          ? "bg-primary/20 text-primary"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      {HOME_LINK.label}
                    </Link>
                    <Link
                      href={MEMBER_ACCOUNT_LINK.href}
                      onClick={closeMobileMenu}
                      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        memberAccountActive
                          ? "bg-primary/20 text-primary"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      {MEMBER_ACCOUNT_LINK.label}
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {isSignedIn ? (
              <div className="border-t border-white/10 p-4">
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onLogout();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
