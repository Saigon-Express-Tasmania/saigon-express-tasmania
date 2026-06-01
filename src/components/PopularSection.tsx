"use client";

import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Star, Plus, Minus, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import type { MenuItem } from "@/contexts/CartContext";

// ─── Category fallback images (not translated) ────────────────────────────────

const CATEGORY_IMGS: Record<string, string> = {
  Entrée: "/manus-storage/entree-seafood-spring-rolls_f060f6bd.jpg",
  "Bánh Mì": "/manus-storage/crispyroastporkbanhmi_ce355122.jpg",
  "Rice Paper Rolls": "/manus-storage/spring-rolls-2_f1e40ae6.jpg",
  Pho: "/manus-storage/pho-1_92a9985e.jpg",
  "Noodle Soup": "/manus-storage/pho-2_4fc44f9f.jpg",
  "Bun Bowl": "/manus-storage/bun-bowl-1_3b12ea6c.jpg",
  "Rice Dishes": "/manus-storage/banh-mi-2_7d02846f.jpg",
  "Grill Signatures": "/manus-storage/banh-mi-1_9ba4dcf0.jpg",
  "Bao Buns": "/manus-storage/banh-mi-3_465cb7d1.jpg",
  Omelette: "/manus-storage/bun-bowl-1_3b12ea6c.jpg",
  "Burgers & Chicken": "/manus-storage/banh-mi-2_7d02846f.jpg",
  "Meal Deals": "/manus-storage/banh-mi-3_465cb7d1.jpg",
  Drinks: "/manus-storage/spring-rolls-2_f1e40ae6.jpg",
};
const DEFAULT_IMG = "/manus-storage/banh-mi-1_9ba4dcf0.jpg";

// ─── Component ────────────────────────────────────────────────────────────────

export default function PopularSection() {
  const t = useTranslations("PopularSection");
  const { data: items, isLoading, error } = trpc.public.popularItems.useQuery();
  const { cart, addToCart, removeFromCart, setCartOpen } = useCart();

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section className="py-20 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-5 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !items || items.length === 0) return null;

  // ── Derived cart totals for the "View Cart" CTA ─────────────────────────────
  const cartTotalCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotalPrice = cart
    .reduce(
      (s, c) =>
        s +
        (parseFloat(c.item.price) + (c.customisation?.extraPrice ?? 0)) * c.qty,
      0,
    )
    .toFixed(2);

  return (
    <section className="py-20 lg:py-28 bg-brand-cream">
      <div className="max-w-[1280px] mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-10 reveal">
          <div>
            <p className="text-xs font-bold text-brand-red uppercase tracking-[0.2em] mb-2">
              {t("sectionLabel")}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-brand-dark leading-tight">
              {t("heading")}
            </h2>
          </div>
          <Link
            href="/menu"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-brand-red hover:text-brand-red/80 transition-colors"
          >
            {t("viewFullMenu")}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 reveal">
          {(items as MenuItem[]).map((item) => {
            const cartEntries = cart.filter((c) => c.item.id === item.id);
            const totalQtyInCart = cartEntries.reduce((s, c) => s + c.qty, 0);
            const lastEntry = cartEntries[cartEntries.length - 1];

            return (
              <div
                key={item.id}
                className="group bg-white overflow-hidden card-lift"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <AppImage
                    src={
                      item.imageUrl ??
                      CATEGORY_IMGS[item.category] ??
                      DEFAULT_IMG
                    }
                    alt={item.name}
                    priority
                    fill
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Popular badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-brand-red text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 flex items-center gap-1 shadow-md">
                      <Star size={9} fill="currentColor" /> {t("popularBadge")}
                    </span>
                  </div>

                  {/* Inline qty controls on image when in cart */}
                  {lastEntry && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-0 bg-white shadow-lg overflow-hidden z-10">
                      <button
                        onClick={() => removeFromCart(lastEntry.cartLineId)}
                        className="w-8 h-8 flex items-center justify-center text-brand-dark hover:bg-gray-100 transition-colors"
                        aria-label={t("removeLastCartLine")}
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-brand-dark">
                        {totalQtyInCart}
                      </span>
                      <button
                        onClick={() => addToCart(item, undefined, 1, true)}
                        className="w-8 h-8 flex items-center justify-center bg-brand-red text-white hover:bg-brand-red/90 transition-colors"
                        aria-label={t("addAnother")}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="text-[10px] font-bold text-brand-red uppercase tracking-widest mb-1">
                    {item.category}
                  </p>
                  <h3 className="font-serif text-brand-dark text-lg leading-snug mb-1">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-brand-dark/50 line-clamp-2 mb-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                    <span className="font-bold text-brand-dark">
                      ${parseFloat(item.price).toFixed(2)}
                    </span>

                    {lastEntry ? (
                      /* Inline qty controls in card footer */
                      <div className="flex items-center gap-0 border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => removeFromCart(lastEntry.cartLineId)}
                          className="w-8 h-8 flex items-center justify-center text-brand-dark hover:bg-gray-100 transition-colors"
                          aria-label={t("removeLastCartLine")}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-brand-dark">
                          {totalQtyInCart}
                        </span>
                        <button
                          onClick={() => addToCart(item, undefined, 1, true)}
                          className="w-8 h-8 flex items-center justify-center bg-brand-red text-white hover:bg-brand-red/90 transition-colors"
                          aria-label={t("addAnother")}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    ) : (
                      /* Add to Cart button */
                      <button
                        onClick={() => addToCart(item, undefined, 1, false)}
                        disabled={!item.isAvailable}
                        className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 transition-colors ${
                          item.isAvailable
                            ? "bg-brand-red text-white hover:bg-brand-red/90"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <ShoppingCart size={12} />
                        {item.isAvailable ? t("addToCart") : t("unavailable")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View cart CTA */}
        {cart.length > 0 && (
          <div className="mt-8 flex justify-center reveal">
            <button
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 bg-brand-dark text-white font-semibold px-6 py-3 hover:bg-brand-dark/90 transition-colors text-sm"
            >
              <ShoppingCart size={16} />
              {t("viewCart", { count: cartTotalCount, total: cartTotalPrice })}
            </button>
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-6 text-center sm:hidden">
          <Link href="/menu" className="inline-flex items-center gap-2 btn-red">
            {t("viewFullMenu")}
          </Link>
        </div>
      </div>
    </section>
  );
}
