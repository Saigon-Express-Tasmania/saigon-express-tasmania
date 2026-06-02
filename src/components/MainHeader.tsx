"use client";

import AppImage from "@/components/AppImage";
import { useState } from "react";
import Link from "@/components/link";
import { useCart } from "@/contexts/CartContext";
import { MapPin, Menu, ShoppingCart, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { PORTAL_LINKS, NAV_LINKS } from "@/config/nav-links";

const LOGO_URL = "/manus-storage/saigonexpresslogo_clean_719f26ac.png";

export default function MainHeader() {
  const tLinks = useTranslations("NavLinks");
  const t = useTranslations("Home");

  const [mobileOpen, setMobileOpen] = useState(false);
  const { cartCount, setCartOpen } = useCart();

  return (
    <>
      <div className="topbar sticky top-0 z-50">
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
            <a
              href="tel:0416036016"
              className="hover:text-white transition-colors"
            >
              0416 036 016
            </a>
            <span>·</span>
            <a
              href="mailto:info@saigonexpress.com.au"
              className="hover:text-white transition-colors"
            >
              info@saigonexpress.com.au
            </a>
          </div>
        </div>
      </div>
      <header className="sticky-header-scroll-shadow sticky top-9 z-50 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="shrink-0">
            <AppImage
              src={LOGO_URL}
              alt="Saigon Express Tasmania"
              width={180}
              height={40}
              priority
              className="h-10 object-contain"
              style={{
                aspectRatio: "48/15",
              }}
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
              href="/user-portal"
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-brand-dark/70 hover:text-brand-red transition-colors"
            >
              👤 {tLinks("my_account")}
            </Link>
            {cartCount > 0 ? (
              <button
                onClick={() => setCartOpen(true)}
                className="btn-red text-sm py-2 px-4 flex items-center gap-1.5"
              >
                <ShoppingCart size={15} />
                {tLinks("order", {
                  count: cartCount,
                })}
              </button>
            ) : (
              <Link
                href="/menu#categories"
                className="btn-red text-sm py-2 px-4"
              >
                <ShoppingCart size={15} />
                {tLinks("order_online")}
              </Link>
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
    </>
  );
}
