"use client";

import AppImage from "@/components/AppImage";
import { useCallback, useMemo, useState } from "react";
import Link from "@/components/link";
import { useCart } from "@/contexts/CartContext";
import { useCateringCart } from "@/contexts/CateringCartContext";
import { useGuestCateringOrder } from "@/contexts/GuestCateringOrderContext";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { useFormattedContactPhone } from "@/hooks/useFormattedContactPhone";
import { useSupabase } from "@/hooks/useSupabase";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/config/localize";
import { MapPin, Menu, ClipboardList, ShoppingCart, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { PORTAL_LINKS, NAV_LINKS } from "@/config/nav-links";
import { LOGO_IMG_CLASS, LOGO_INTRINSIC, LOGO_URL } from "@/lib/site-images";
import StoreLocationsDialog from "@/components/StoreLocationsDialog";
import { hasPrivilege } from "@/lib/privileges";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import type { StoreLocation } from "@/types";

type MainHeaderProps = {
  storeLocations: StoreLocation[];
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

function isCateringShopRoute(pathname: string): boolean {
  const path = stripLocalePrefix(pathname.replace(/\/$/, "") || "/");
  return path === "/catering";
}

export default function MainHeader({ storeLocations }: MainHeaderProps) {
  const tLinks = useTranslations("NavLinks");
  const t = useTranslations("Home");
  const contactEmail = useSiteSetting("contact_us_email")?.trim();
  const contactPhone = useFormattedContactPhone();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [orderLocationsOpen, setOrderLocationsOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const { cartCount, setCartOpen } = useCart();
  const {
    cartCount: cateringCartCount,
    setCartOpen: setCateringCartOpen,
    isHydrated: isCateringCartHydrated,
  } = useCateringCart();
  const {
    hasActiveGuestOrder,
    setLastOrderOpen,
    isHydrated: isGuestOrderHydrated,
  } = useGuestCateringOrder();
  const { isSignedIn, profile, authMetadata } = useSupabase();
  const isCateringPage = isCateringShopRoute(pathname);
  const showGuestLastOrder =
    isCateringPage && !isSignedIn && isGuestOrderHydrated && hasActiveGuestOrder;
  const showCateringCart = isCateringPage && !showGuestLastOrder;
  const activeCartCount = showCateringCart ? cateringCartCount : cartCount;
  const openActiveCart = () => {
    if (showGuestLastOrder) {
      setLastOrderOpen(true);
      return;
    }
    if (showCateringCart) {
      setCateringCartOpen(true);
    } else {
      setCartOpen(true);
    }
  };

  const myAccountHref = useMemo(() => {
    if (!isSignedIn) return "/member";
    if (!isWholesaleMemberConfirmed(profile, authMetadata)) return "/member";
    if (hasPrivilege(authMetadata.privileges, "warehouse")) {
      return "/member/dashboard";
    }
    return "/wholesale/shop";
  }, [authMetadata, isSignedIn, profile]);

  const handleOrderOnlineClick = useCallback(() => {
    // Previous: navigate to menu categories anchor
    // href="/menu#categories"
    setOrderLocationsOpen(true);
  }, []);

  return (
    <>
      {/* <div className="topbar sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-4 h-9 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
            {PORTAL_LINKS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors whitespace-nowrap text-xs font-medium"
              >
                <span>{p.icon}</span>
                {t(`portals.${p.id}`)}
              </Link>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-4 text-white/60 text-xs">
            {contactPhone ? (
              <a
                href={contactPhone.telHref}
                className="hover:text-white transition-colors"
              >
                {contactPhone.display}
              </a>
            ) : null}
            {contactPhone && contactEmail ? <span>·</span> : null}
            {contactEmail ? (
              <a
                href={`mailto:${contactEmail}`}
                className="hover:text-white transition-colors"
              >
                {contactEmail}
              </a>
            ) : null}
          </div>
        </div>
      </div> */}
      <header className="main-header-under-shade sticky-header-scroll-shadow sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="shrink-0">
            <AppImage
              src={LOGO_URL}
              alt="Saigon Express Tasmania"
              width={LOGO_INTRINSIC.width}
              height={LOGO_INTRINSIC.height}
              preload
              className={`h-10 ${LOGO_IMG_CLASS}`}
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-brand-dark/80 hover:text-brand-red transition-colors"
              >
                {tLinks(`${l.key}`)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/stores"
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-brand-dark/70 hover:text-brand-red transition-colors"
            >
              <MapPin size={15} />
              {tLinks("find_us")}
            </Link>
            <Link
              href="/catering"
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-brand-dark/70 hover:text-brand-red transition-colors"
            >
              🍱 {tLinks("catering")}
            </Link>
            <Link
              href={myAccountHref}
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-brand-dark/70 hover:text-brand-red transition-colors"
            >
              👤 {tLinks("my_account")}
            </Link>
            {showGuestLastOrder ? (
              <button
                type="button"
                onClick={() => setLastOrderOpen(true)}
                className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20"
              >
                <ClipboardList size={15} />
                Last order
              </button>
            ) : activeCartCount > 0 ? (
              <button
                onClick={openActiveCart}
                className={`text-sm py-2 px-4 flex items-center gap-1.5 ${
                  showCateringCart
                    ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 font-semibold text-emerald-700 hover:bg-emerald-500/20"
                    : "btn-red"
                }`}
              >
                <ShoppingCart size={15} />
                {showCateringCart
                  ? `Catering (${activeCartCount})`
                  : tLinks("order", { count: activeCartCount })}
              </button>
            ) : showCateringCart && isCateringCartHydrated ? (
              <button
                type="button"
                onClick={openActiveCart}
                className="flex items-center gap-1.5 rounded-md border border-brand-dark/15 px-4 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:border-emerald-500/40 hover:text-emerald-700"
              >
                <ShoppingCart size={15} />
                Catering cart
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOrderOnlineClick}
                className="btn-red text-sm py-2 px-4 flex items-center gap-1.5"
              >
                <ShoppingCart size={15} />
                {tLinks("order_online")}
              </button>
            )}
            <button
              className="lg:hidden p-2 text-brand-dark"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="absolute top-full left-0 right-0 lg:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 shadow-lg z-50">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-brand-dark/80 hover:text-brand-red py-1"
              >
                {tLinks(`${l.key}`)}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              {PORTAL_LINKS.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-brand-dark/60 hover:text-brand-red py-1"
                >
                  {p.icon} {t(`portals.${p.id}`)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <StoreLocationsDialog
        open={orderLocationsOpen}
        onClose={() => setOrderLocationsOpen(false)}
        stores={storeLocations}
      />
    </>
  );
}
