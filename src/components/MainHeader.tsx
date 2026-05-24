"use client";

import AppImage from "@/components/AppImage";
import { useState } from "react";
import Link from "@/components/link";
import { useCart } from "@/contexts/CartContext";
import { MapPin, Menu, ShoppingCart, X } from "lucide-react";

const LOGO_URL = "/manus-storage/saigonexpresslogo_clean_719f26ac.png";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Our Food" },
  { href: "/our-story", label: "Our Story" },
  { href: "/wholesale-shop", label: "Wholesale Shop" },
  { href: "/franchise", label: "Franchise" },
  { href: "/faq", label: "FAQ" },
];

export const PORTAL_LINKS = [
  { href: "/portals/franchise", label: "Franchise Portal", icon: "🏪" },
  { href: "/portals/wholesale", label: "Wholesale Portal", icon: "📦" },
  { href: "/portals/warehouse", label: "Warehouse Portal", icon: "🏭" },
];

export default function MainHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { cartCount, setCartOpen } = useCart();

  return (
    <header className="sticky-header-scroll-shadow sticky top-0 z-50 bg-white">
      <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex-shrink-0">
          <AppImage src={LOGO_URL} alt="Saigon Express Tasmania" width={180} height={40} priority className="h-10 w-auto object-contain" />
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-brand-dark/80 hover:text-brand-red transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/stores"
            className="hidden md:flex items-center gap-1.5 text-sm font-medium text-brand-dark/70 hover:text-brand-red transition-colors"
          >
            <MapPin size={15} /> Find Us
          </Link>
          <Link
            href="/catering"
            className="hidden md:flex items-center gap-1.5 text-sm font-medium text-brand-dark/70 hover:text-brand-red transition-colors"
          >
            🍱 Catering
          </Link>
          <Link
            href="/user-portal"
            className="hidden md:flex items-center gap-1.5 text-sm font-medium text-brand-dark/70 hover:text-brand-red transition-colors"
          >
            👤 My Account
          </Link>
          {cartCount > 0 ? (
            <button onClick={() => setCartOpen(true)} className="btn-red text-sm py-2 px-4 flex items-center gap-1.5">
              <ShoppingCart size={15} />
              Order ({cartCount})
            </button>
          ) : (
            <Link href="/menu" className="btn-red text-sm py-2 px-4">
              <ShoppingCart size={15} />
              Order Online
            </Link>
          )}
          <button className="lg:hidden p-2 text-brand-dark" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-brand-dark/80 hover:text-brand-red py-1"
            >
              {l.label}
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
                {p.icon} {p.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
