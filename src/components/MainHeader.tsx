"use client";

import AppImage from "@/components/AppImage";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "@/components/link";
import { useCart } from "@/contexts/CartContext";
import { useCateringCart } from "@/contexts/CateringCartContext";
import { useGuestCateringOrder } from "@/contexts/GuestCateringOrderContext";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { useFormattedContactPhone } from "@/hooks/useFormattedContactPhone";
import { useSupabase } from "@/hooks/useSupabase";
import { isPublicCateringShopRoute } from "@/lib/catering-routes";
import { Menu, ClipboardList, ShoppingCart, X, ChevronDown, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { PORTAL_LINKS, NAV_LINKS, isNavDropdown } from "@/config/nav-links";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LOGO_IMG_CLASS, LOGO_INTRINSIC, LOGO_URL } from "@/lib/site-images";
import StoreLocationsDialog from "@/components/StoreLocationsDialog";
import { hasPrivilege } from "@/lib/privileges";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import type { StoreLocation } from "@/types";
import { cn } from "@/lib/utils";

type MainHeaderProps = {
  storeLocations: StoreLocation[];
};

const MOBILE_MENU_ANIM_MS = 220;
type MobileMenuPhase = "closed" | "entering" | "open" | "exiting";

export default function MainHeader({ storeLocations }: MainHeaderProps) {
  const tLinks = useTranslations("NavLinks");
  const t = useTranslations("Home");
  const contactEmail = useSiteSetting("contact_us_email")?.trim();
  const contactPhone = useFormattedContactPhone();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMenuPhase, setMobileMenuPhase] = useState<MobileMenuPhase>("closed");
  const [communityMenuOpen, setCommunityMenuOpen] = useState(false);
  const [mobileCommunityOpen, setMobileCommunityOpen] = useState(false);
  const [orderLocationsOpen, setOrderLocationsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
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
  const isCateringPage = isPublicCateringShopRoute(pathname);
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      setMobileMenuPhase("entering");
      const timer = window.setTimeout(
        () => setMobileMenuPhase("open"),
        MOBILE_MENU_ANIM_MS,
      );
      return () => window.clearTimeout(timer);
    }

    setMobileMenuPhase((current) =>
      current === "closed" || current === "exiting" ? current : "exiting",
    );
    const timer = window.setTimeout(
      () => setMobileMenuPhase("closed"),
      MOBILE_MENU_ANIM_MS,
    );
    return () => window.clearTimeout(timer);
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileMenuPhase === "closed") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuPhase]);

  const isCommunityActive = useMemo(
    () =>
      NAV_LINKS.some(
        (item) =>
          isNavDropdown(item) &&
          item.key === "community" &&
          item.items.some((link) => pathname.startsWith(link.href)),
      ),
    [pathname],
  );

  const desktopNavClass = (active: boolean) =>
    cn(
      "rounded-full px-3.5 py-2 text-sm font-semibold transition-all duration-200",
      active
        ? "bg-brand-red/10 text-brand-red ring-1 ring-brand-red/25 shadow-sm"
        : "text-brand-dark/75 hover:bg-brand-amber/15 hover:text-brand-red",
    );

  const mobileNavClass = (active: boolean) =>
    cn(
      "flex w-full items-center rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm transition-all duration-200",
      active
        ? "border-brand-red/30 bg-red-50 text-brand-red shadow-[inset_3px_0_0_0_#C8102E]"
        : "border-brand-red/10 bg-white text-brand-dark hover:border-brand-amber hover:bg-amber-50 hover:text-brand-red active:scale-[0.99]",
    );

  const dropdownLinkClass = (active: boolean) =>
    cn(
      "block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
      active
        ? "bg-brand-red/10 text-brand-red"
        : "text-brand-dark/75 hover:bg-brand-amber/10 hover:text-brand-red",
    );

  const mobileMenuPanelAnimClass =
    mobileMenuPhase === "entering"
      ? "animate-mobile-menu-in"
      : mobileMenuPhase === "exiting"
        ? "animate-mobile-menu-out"
        : "";
  const mobileMenuBackdropAnimClass =
    mobileMenuPhase === "entering"
      ? "animate-mobile-menu-backdrop-in"
      : mobileMenuPhase === "exiting"
        ? "animate-mobile-menu-backdrop-out"
        : "";
  const mobileMenuMotionStyle = {
    "--mobile-menu-anim-ms": `${MOBILE_MENU_ANIM_MS}ms`,
  } as CSSProperties;

  return (
    <>
      {isMounted && mobileMenuPhase !== "closed"
        ? createPortal(
            <button
              type="button"
              aria-label="Close menu"
              className={cn(
                "fixed inset-0 z-40 bg-black/50 lg:hidden",
                mobileMenuBackdropAnimClass,
              )}
              style={mobileMenuMotionStyle}
              onClick={() => setMobileOpen(false)}
            />,
            document.body,
          )
        : null}
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
      <header className="main-header-under-shade sticky-header-scroll-shadow relative sticky top-0 z-50 border-b border-brand-red/10 bg-gradient-to-r from-white via-brand-cream/50 to-white backdrop-blur-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-red via-brand-amber to-brand-red" />
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

          <nav className="hidden lg:flex items-center gap-1.5">
            {NAV_LINKS.map((item) =>
              isNavDropdown(item) ? (
                <Popover
                  key={item.key}
                  open={communityMenuOpen}
                  onOpenChange={setCommunityMenuOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1",
                        desktopNavClass(isCommunityActive),
                      )}
                    >
                      {tLinks(item.key)}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          communityMenuOpen ? "rotate-180 text-brand-amber" : "",
                        )}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-52 border-brand-red/15 bg-gradient-to-b from-white to-brand-cream/90 p-2 shadow-xl"
                  >
                    {item.items.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setCommunityMenuOpen(false)}
                        className={dropdownLinkClass(
                          pathname.startsWith(link.href),
                        )}
                      >
                        {tLinks(link.key)}
                      </Link>
                    ))}
                  </PopoverContent>
                </Popover>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={desktopNavClass(pathname.startsWith(item.href))}
                >
                  {tLinks(item.key)}
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={myAccountHref}
              className="hidden md:inline-flex items-center gap-2 rounded-full border border-brand-amber/35 bg-brand-amber/10 px-4 py-2 text-sm font-semibold text-brand-dark transition-all hover:border-brand-red/35 hover:bg-brand-red/10 hover:text-brand-red"
            >
              <User size={15} className="text-brand-red" />
              {tLinks("my_account")}
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
              className={cn(
                "lg:hidden rounded-full border p-2.5 transition-all duration-200",
                mobileOpen
                  ? "border-brand-red bg-brand-red text-white shadow-md"
                  : "border-brand-red/25 bg-brand-red/8 text-brand-red hover:bg-brand-red hover:text-white",
              )}
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuPhase !== "closed" && (
          <div
            className={cn(
              "absolute top-full left-0 right-0 lg:hidden border-t-2 border-brand-red/15 bg-gradient-to-b from-white via-brand-cream/80 to-brand-cream px-4 py-5 shadow-[0_18px_40px_rgba(200,16,46,0.14)] z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto",
              mobileMenuPanelAnimClass,
            )}
            style={mobileMenuMotionStyle}
          >
            <div className="space-y-2">
              {NAV_LINKS.map((item) =>
                isNavDropdown(item) ? (
                  <div key={item.key} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setMobileCommunityOpen((v) => !v)}
                      className={cn(
                        mobileNavClass(isCommunityActive),
                        "justify-between",
                      )}
                    >
                      <span>{tLinks(item.key)}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          mobileCommunityOpen
                            ? "rotate-180 text-brand-amber"
                            : "text-brand-red/70",
                        )}
                      />
                    </button>
                    {mobileCommunityOpen ? (
                      <div className="space-y-2 border-l-2 border-brand-amber/50 pl-3">
                        {item.items.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className={mobileNavClass(
                              pathname.startsWith(link.href),
                            )}
                          >
                            {tLinks(link.key)}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={mobileNavClass(pathname.startsWith(item.href))}
                  >
                    {tLinks(item.key)}
                  </Link>
                ),
              )}
            </div>

            <div className="mt-5 space-y-3 border-t border-brand-red/15 pt-5">
              <Link
                href={myAccountHref}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-dark to-brand-dark/90 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:from-brand-red hover:to-brand-red/90 active:scale-[0.99]"
              >
                <User size={16} />
                {tLinks("my_account")}
              </Link>
              {PORTAL_LINKS.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-brand-amber/25 bg-amber-50 px-4 py-3 text-sm font-semibold text-brand-dark transition-all hover:border-brand-red hover:bg-red-50 hover:text-brand-red"
                >
                  <span>{p.icon}</span>
                  {t(`portals.${p.id}`)}
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
