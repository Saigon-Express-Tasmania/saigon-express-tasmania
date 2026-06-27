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
import { isCateringCartRoute } from "@/lib/catering-routes";
import { hasPrivilege } from "@/lib/privileges";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useCateringCart } from "@/contexts/CateringCartContext";
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

const CATERING_NAV_LINKS = [
  { label: "Shop", href: "/member/catering-shop" },
  { label: "Orders", href: "/member/catering-orders" },
] as const;

const FRANCHISE_NAV_LINKS = [
  { label: "Resources Hub", href: "/member/resources-hub" },
  { label: "Menu Academy", href: "/member/menu-academy" },
] as const;

export type MemberHeaderMember = {
  businessName: string;
  privileges: BusinessType[];
  avatarUrl?: string | null;
};

type MemberHeaderProps = {
  member?: MemberHeaderMember | null;
  onLogout: () => void;
  theme?: "dark" | "light";
};

type MemberPortalTheme = "dark" | "light";

type CartContext = "wholesale" | "catering";

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

function isCateringNavActive(pathname: string): boolean {
  return CATERING_NAV_LINKS.some((link) => isActiveNav(pathname, link.href));
}

function isFranchiseNavActive(pathname: string): boolean {
  return FRANCHISE_NAV_LINKS.some((link) => isActiveNav(pathname, link.href));
}

function isWholesaleCartRoute(pathname: string): boolean {
  const path = stripLocalePrefix(pathname.replace(/\/$/, "") || "/");
  return path === "/wholesale/shop" || path === "/wholesale/orders";
}

function isCateringCartRouteForHeader(pathname: string): boolean {
  return isCateringCartRoute(pathname);
}

function getCartContext(pathname: string): CartContext | null {
  if (isCateringCartRouteForHeader(pathname)) return "catering";
  if (isWholesaleCartRoute(pathname)) return "wholesale";
  return null;
}

const CART_BUTTON_STYLES: Record<
  CartContext,
  { button: string; badge: string }
> = {
  wholesale: {
    button:
      "bg-brand-amber/15 border-brand-amber/40 text-brand-amber hover:bg-brand-amber/25",
    badge: "bg-brand-amber text-black",
  },
  catering: {
    button:
      "bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25",
    badge: "bg-emerald-500 text-white",
  },
};

function navLinkClass(active: boolean, theme: MemberPortalTheme): string {
  if (theme === "light") {
    return `px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? "bg-primary/10 text-primary"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
    }`;
  }

  return `px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
    active
      ? "bg-primary/20 text-primary"
      : "text-white/55 hover:text-white hover:bg-white/8"
  }`;
}

function popoverContentClass(theme: MemberPortalTheme): string {
  return theme === "light"
    ? "w-44 border-gray-200 bg-white p-1 text-gray-900 shadow-xl"
    : "w-44 border-white/10 bg-black/95 p-1 text-white shadow-xl backdrop-blur-md";
}

function popoverLinkClass(active: boolean, theme: MemberPortalTheme): string {
  if (theme === "light") {
    return `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;
  }

  return `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "bg-primary/20 text-primary"
      : "text-white/70 hover:bg-white/8 hover:text-white"
  }`;
}

function mobileNavLinkClass(active: boolean, theme: MemberPortalTheme): string {
  if (theme === "light") {
    return `block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;
  }

  return `block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    active
      ? "bg-primary/20 text-primary"
      : "text-white/70 hover:bg-white/8 hover:text-white"
  }`;
}

function MemberInfo({
  member,
  theme,
}: {
  member: MemberHeaderMember;
  theme: MemberPortalTheme;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 text-left md:flex-none md:text-right">
        <div
          className={`text-xs font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}
        >
          {member.businessName}
        </div>
        <MemberPrivilegeBadges
          privileges={member.privileges}
          className="mt-0.5 md:justify-end"
        />
      </div>
      {member.avatarUrl ? (
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border ${
            theme === "light"
              ? "border-gray-200 bg-gray-50"
              : "border-white/15 bg-white/5"
          }`}
        >
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
  variant,
  showCartSpinner,
  cartCount,
  onOpenCart,
  className = "",
}: {
  variant: CartContext;
  showCartSpinner: boolean;
  cartCount: number;
  onOpenCart: () => void;
  className?: string;
}) {
  const styles = CART_BUTTON_STYLES[variant];

  return (
    <button
      type="button"
      onClick={onOpenCart}
      disabled={showCartSpinner}
      className={`relative flex items-center gap-2 rounded-xl border px-4 py-2 transition-colors disabled:pointer-events-none disabled:opacity-70 ${styles.button} ${className}`}
    >
      {showCartSpinner ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      <span className="text-sm font-semibold">Cart</span>
      {!showCartSpinner && cartCount > 0 ? (
        <span
          className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${styles.badge}`}
        >
          {cartCount}
        </span>
      ) : null}
    </button>
  );
}

export default function MemberHeader({
  member,
  onLogout,
  theme = "dark",
}: MemberHeaderProps) {
  const pathname = usePathname();
  const { isLoading: isAccountLoading, isSignedIn } = useSupabase();
  const { cartCount, setCartOpen, isHydrated } = useWholesaleCart();
  const {
    cartCount: cateringCartCount,
    setCartOpen: setCateringCartOpen,
    isHydrated: isCateringCartHydrated,
  } = useCateringCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wholesaleMenuOpen, setWholesaleMenuOpen] = useState(false);
  const [cateringMenuOpen, setCateringMenuOpen] = useState(false);
  const [franchiseMenuOpen, setFranchiseMenuOpen] = useState(false);

  const cartContext = getCartContext(pathname);
  const isCartLoading =
    cartContext === "catering" ? !isCateringCartHydrated : !isHydrated;
  const showCartSpinner = isAccountLoading || isCartLoading;
  const activeCartCount =
    cartContext === "catering" ? cateringCartCount : cartCount;
  const openActiveCart = () => {
    if (cartContext === "catering") {
      setCateringCartOpen(true);
    } else {
      setCartOpen(true);
    }
  };
  const hasWholesalePrivilege = member
    ? hasPrivilege(member.privileges, "wholesale")
    : false;
  const hasFranchisePrivilege = member
    ? hasPrivilege(member.privileges, "franchise")
    : false;
  const homeActive = isActiveNav(pathname, HOME_LINK.href);
  const memberAccountActive = isActiveNav(pathname, MEMBER_ACCOUNT_LINK.href);
  const dashboardActive = isActiveNav(pathname, DASHBOARD_LINK.href);
  const profileActive = isActiveNav(pathname, PROFILE_LINK.href);
  const wholesaleNavActive = isWholesaleNavActive(pathname);
  const cateringNavActive = isCateringNavActive(pathname);
  const franchiseNavActive = isFranchiseNavActive(pathname);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const isLight = theme === "light";

  return (
    <>
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${
          isLight
            ? "bg-white/95 border-gray-200"
            : "bg-black/95 border-white/10"
        }`}
      >
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
                    className={navLinkClass(dashboardActive, theme)}
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
                          className={`inline-flex items-center gap-1 ${navLinkClass(wholesaleNavActive, theme)}`}
                        >
                          Wholesale
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${wholesaleMenuOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className={popoverContentClass(theme)}
                      >
                        {WHOLESALE_NAV_LINKS.map((link) => {
                          const active = isActiveNav(pathname, link.href);
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setWholesaleMenuOpen(false)}
                              className={popoverLinkClass(active, theme)}
                            >
                              {link.label}
                            </Link>
                          );
                        })}
                      </PopoverContent>
                    </Popover>
                  ) : null}
                  <Popover
                    open={cateringMenuOpen}
                    onOpenChange={setCateringMenuOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 ${navLinkClass(cateringNavActive, theme)}`}
                      >
                        Catering
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${cateringMenuOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className={popoverContentClass(theme)}
                    >
                      {CATERING_NAV_LINKS.map((link) => {
                        const active = isActiveNav(pathname, link.href);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setCateringMenuOpen(false)}
                            className={popoverLinkClass(active, theme)}
                          >
                            {link.label}
                          </Link>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                  {hasFranchisePrivilege ? (
                    <Popover
                      open={franchiseMenuOpen}
                      onOpenChange={setFranchiseMenuOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 ${navLinkClass(franchiseNavActive, theme)}`}
                        >
                          Franchise
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${franchiseMenuOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className={popoverContentClass(theme)}
                      >
                        {FRANCHISE_NAV_LINKS.map((link) => {
                          const active = isActiveNav(pathname, link.href);
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setFranchiseMenuOpen(false)}
                              className={popoverLinkClass(active, theme)}
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
                    className={navLinkClass(profileActive, theme)}
                  >
                    {PROFILE_LINK.label}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={HOME_LINK.href}
                    className={navLinkClass(homeActive, theme)}
                  >
                    {HOME_LINK.label}
                  </Link>
                  <Link
                    href={MEMBER_ACCOUNT_LINK.href}
                    className={navLinkClass(memberAccountActive, theme)}
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
                <MemberInfo member={member} theme={theme} />
              </div>
            ) : null}
            {cartContext ? (
              <CartButton
                variant={cartContext}
                showCartSpinner={showCartSpinner}
                cartCount={activeCartCount}
                onOpenCart={openActiveCart}
              />
            ) : null}
            {isSignedIn ? (
              <button
                type="button"
                onClick={onLogout}
                className={`hidden md:block p-2 transition-colors ${
                  isLight
                    ? "text-gray-400 hover:text-gray-700"
                    : "text-white/40 hover:text-white"
                }`}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : null}
            <button
              type="button"
              className={`md:hidden p-2 transition-colors ${
                isLight
                  ? "text-gray-600 hover:text-gray-900"
                  : "text-white/70 hover:text-white"
              }`}
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
          <aside
            className={`absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col shadow-2xl ${
              isLight
                ? "border-l border-gray-200 bg-white"
                : "border-l border-white/10 bg-black/95 backdrop-blur-md"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b px-4 py-4 ${
                isLight ? "border-gray-200" : "border-white/10"
              }`}
            >
              <span
                className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}
              >
                Menu
              </span>
              <button
                type="button"
                onClick={closeMobileMenu}
                className={`p-2 transition-colors ${
                  isLight
                    ? "text-gray-500 hover:text-gray-900"
                    : "text-white/60 hover:text-white"
                }`}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {member ? (
                <div
                  className={`rounded-lg border p-3 ${
                    isLight
                      ? "border-gray-200 bg-gray-50"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <MemberInfo member={member} theme={theme} />
                </div>
              ) : null}

              <nav className="space-y-1">
                {isSignedIn ? (
                  <>
                    <Link
                      href={DASHBOARD_LINK.href}
                      onClick={closeMobileMenu}
                      className={mobileNavLinkClass(dashboardActive, theme)}
                    >
                      {DASHBOARD_LINK.label}
                    </Link>
                    {hasWholesalePrivilege ? (
                      <div className="space-y-1">
                        <div
                          className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide ${
                            isLight ? "text-gray-400" : "text-white/40"
                          }`}
                        >
                          Wholesale
                        </div>
                        {WHOLESALE_NAV_LINKS.map((link) => {
                          const active = isActiveNav(pathname, link.href);
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={closeMobileMenu}
                              className={mobileNavLinkClass(active, theme)}
                            >
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      <div
                        className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide ${
                          isLight ? "text-gray-400" : "text-white/40"
                        }`}
                      >
                        Catering
                      </div>
                      {CATERING_NAV_LINKS.map((link) => {
                        const active = isActiveNav(pathname, link.href);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={closeMobileMenu}
                            className={mobileNavLinkClass(active, theme)}
                          >
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                    {hasFranchisePrivilege ? (
                      <div className="space-y-1">
                        <div
                          className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide ${
                            isLight ? "text-gray-400" : "text-white/40"
                          }`}
                        >
                          Franchise
                        </div>
                        {FRANCHISE_NAV_LINKS.map((link) => {
                          const active = isActiveNav(pathname, link.href);
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={closeMobileMenu}
                              className={mobileNavLinkClass(active, theme)}
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
                      className={mobileNavLinkClass(profileActive, theme)}
                    >
                      {PROFILE_LINK.label}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={HOME_LINK.href}
                      onClick={closeMobileMenu}
                      className={mobileNavLinkClass(homeActive, theme)}
                    >
                      {HOME_LINK.label}
                    </Link>
                    <Link
                      href={MEMBER_ACCOUNT_LINK.href}
                      onClick={closeMobileMenu}
                      className={mobileNavLinkClass(memberAccountActive, theme)}
                    >
                      {MEMBER_ACCOUNT_LINK.label}
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {isSignedIn ? (
              <div
                className={`border-t p-4 ${isLight ? "border-gray-200" : "border-white/10"}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onLogout();
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    isLight
                      ? "border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      : "border-white/10 text-white/70 hover:bg-white/8 hover:text-white"
                  }`}
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
