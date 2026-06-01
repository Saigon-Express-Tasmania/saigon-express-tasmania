"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "@/components/link";
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useTranslations } from "next-intl";
import MenuItemImageZoom from "@/components/MenuItemImageZoom";
import {
  ItemCustomiseModal,
  type ItemCustomisation,
} from "@/components/ItemCustomiseModal";
import PickLocationModal from "@/components/PickLocationModal";
import { useCart, type MenuItem } from "@/contexts/CartContext";
import type { FeaturedReview, SiteCategory, StoreLocation } from "@/types";

const DEFAULT_IMG = "/manus-storage/banh-mi-1_9ba4dcf0.jpg";

type MenuItemViewProps = {
  item: MenuItem;
  menuItems: MenuItem[];
  categoriesContent: SiteCategory[];
  storeLocations: StoreLocation[];
  featuredReviews: FeaturedReview[];
};

export default function MenuItemView({
  item,
  menuItems,
  categoriesContent,
  storeLocations,
  featuredReviews,
}: MenuItemViewProps) {
  const t = useTranslations("MenuItem");
  const tMenu = useTranslations("Menu");

  const [qty, setQty] = useState(1);
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [pickLocationOpen, setPickLocationOpen] = useState(false);

  const { cartCount, cartTotal, addToCart, setCartOpen } = useCart();

  const categoryImageMap = useMemo<Record<string, string>>(
    () =>
      categoriesContent.reduce<Record<string, string>>((acc, category) => {
        if (category.imageUrl) acc[category.alias] = category.imageUrl;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const catOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    menuItems.forEach((m) => {
      if (!map.has(m.category)) map.set(m.category, m.sortOrder ?? 99);
    });
    return map;
  }, [menuItems]);

  const categories = useMemo(() => {
    const raw = Array.from(new Set(menuItems.map((m) => m.category)));
    return raw.sort(
      (a, b) => (catOrderMap.get(a) ?? 99) - (catOrderMap.get(b) ?? 99),
    );
  }, [menuItems, catOrderMap]);

  const priceLabel = `$${parseFloat(item.price).toFixed(2)}`;

  const handleCustomiseConfirm = useCallback(
    (customisation: ItemCustomisation) => {
      addToCart(item, { ...customisation, qty }, qty, false);
      setCustomiseOpen(false);
      setCartOpen(true);
    },
    [item, qty, addToCart, setCartOpen],
  );

  const handleAddClick = () => {
    if (!item.isAvailable) return;
    setCustomiseOpen(true);
  };

  const stars = (rating: number) =>
    "★".repeat(Math.min(5, Math.max(0, Math.round(rating))));

  return (
    <div className="min-h-screen bg-brand-cream pb-28 font-sans">
      {/* Category strip — matches Menu.tsx */}
      <div className="sticky top-16 z-40 border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap gap-2 px-6 py-3">
          <Link
            href="/menu"
            className="border border-gray-200 bg-transparent px-4 py-2 text-sm font-semibold text-brand-dark/60 transition-colors hover:border-brand-red/40 hover:text-brand-dark"
          >
            {tMenu("allCategory")}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href="/menu"
              className={`border px-4 py-2 text-sm font-semibold transition-colors ${
                cat === item.category
                  ? "border-brand-red bg-brand-red text-white"
                  : "border-gray-200 bg-transparent text-brand-dark/60 hover:border-brand-red/40 hover:text-brand-dark"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-6">
        <div className="mb-10 flex flex-col gap-10 lg:flex-row lg:gap-12">
          {/* Media */}
          <div className="flex-[1.2]">
            <MenuItemImageZoom
              imageUrls={item.imageUrls}
              alt={item.name}
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="mb-2 font-serif text-3xl font-bold leading-tight text-brand-dark">
              {item.name}
            </h1>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded bg-brand-red/10 px-2 py-0.5 text-[11px] font-semibold text-brand-red">
                {item.category}
              </span>
              {item.isPopular ? (
                <span className="rounded bg-brand-amber/20 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  {t("bestsellerBadge")}
                </span>
              ) : null}
              {!item.isAvailable ? (
                <span className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
                  <AlertCircle size={12} className="text-brand-red" />
                  {tMenu("card.unavailableBadge")}
                </span>
              ) : null}
            </div>

            <div className="mb-5 inline-block rounded bg-brand-red px-4 py-1.5 text-xl font-bold text-white">
              {priceLabel}
            </div>

            {item.description ? (
              <p className="mb-6 text-sm leading-relaxed text-brand-dark/70">
                {item.description}
              </p>
            ) : null}

            <p className="mb-6 border-t border-gray-200 pt-4 text-sm text-brand-dark/60">
              {t("customiseHint")}
            </p>

            <div className="flex items-center gap-4 border-t border-gray-200 pt-5">
              <div className="flex items-center overflow-hidden rounded border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  className="flex h-9 w-9 items-center justify-center text-lg transition-colors hover:bg-gray-50"
                  aria-label={t("decreaseQty")}
                >
                  <Minus size={16} />
                </button>
                <span className="flex h-9 w-10 items-center justify-center border-x border-gray-200 text-sm font-semibold">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((n) => n + 1)}
                  className="flex h-9 w-9 items-center justify-center text-lg transition-colors hover:bg-gray-50"
                  aria-label={t("increaseQty")}
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddClick}
                disabled={!item.isAvailable}
                className={`h-10 flex-1 rounded text-sm font-semibold transition-colors ${
                  item.isAvailable
                    ? "bg-brand-dark text-white hover:bg-brand-dark/90"
                    : "cursor-not-allowed bg-gray-100 text-gray-400"
                }`}
              >
                {t("addToOrder")}
              </button>
            </div>
          </div>
        </div>

        {/* Reviews */}
        {featuredReviews.length > 0 ? (
          <section className="border-t border-gray-200 pt-8">
            <h2 className="mb-5 font-serif text-xl font-bold text-brand-dark">
              {t("reviewsTitle")}
            </h2>
            <div className="flex gap-5 overflow-x-auto pb-2">
              {featuredReviews.map((review) => (
                <article
                  key={review.id}
                  className="min-w-[280px] flex-1 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-2 text-sm text-brand-amber">
                    {stars(review.rating)}
                  </div>
                  <p className="text-sm leading-relaxed text-brand-dark/70">
                    &ldquo;{review.reviewText}&rdquo;
                  </p>
                  {review.reviewerName ? (
                    <p className="mt-3 text-xs font-semibold text-brand-dark/50">
                      — {review.reviewerName}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <Link href="/menu" className="mt-10 inline-block">
          <div className="flex items-center justify-between bg-brand-dark px-8 py-5 text-white transition-colors hover:bg-brand-dark/90">
            <div>
              <p className="font-serif text-lg">{t("backToMenu")}</p>
              <p className="text-xs text-white/50">{t("backToMenuHint")}</p>
            </div>
            <ChevronRight size={18} className="text-white/50" />
          </div>
        </Link>
      </div>

      <PickLocationModal
        open={pickLocationOpen}
        onClose={() => setPickLocationOpen(false)}
        stores={storeLocations}
        onSelect={(store) => {
          setPickLocationOpen(false);
          window.location.href = `/checkout?storeId=${store.id}`;
        }}
      />

      {cartCount > 0 ? (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 p-3 pb-5">
          <div className="pointer-events-auto mx-auto max-w-2xl">
            <button
              type="button"
              onClick={() => setPickLocationOpen(true)}
              className="flex w-full items-center gap-4 rounded-2xl bg-brand-red px-5 py-4 text-white shadow-2xl transition-all duration-150 hover:bg-red-700 active:scale-[0.99]"
            >
              <div className="relative shrink-0">
                <ShoppingCart size={26} className="text-white" />
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black leading-none text-brand-red">
                  {cartCount}
                </span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-base font-bold leading-tight">
                  {tMenu("checkoutBar.heading")}
                </div>
                <div className="mt-0.5 text-sm text-white/80">
                  {tMenu("checkoutBar.summary", {
                    count: cartCount,
                    total: cartTotal.toFixed(2),
                  })}
                </div>
              </div>
              <ArrowRight size={20} className="shrink-0 text-white/70" />
            </button>
          </div>
        </div>
      ) : null}

      {customiseOpen ? (
        <ItemCustomiseModal
          item={{
            ...item,
            imageUrl:
              item.imageUrl ??
              categoryImageMap[item.category] ??
              DEFAULT_IMG,
          }}
          onConfirm={handleCustomiseConfirm}
          onClose={() => setCustomiseOpen(false)}
        />
      ) : null}
    </div>
  );
}
