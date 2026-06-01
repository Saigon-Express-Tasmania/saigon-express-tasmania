"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "@/components/link";
import {
  ShoppingCart,
  Plus,
  Minus,
  AlertCircle,
  MapPin,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { DEFAULT_LOCALE } from "@/config/localize";
import AddOnSuggestionModal, {
  type SuggestedItem,
} from "@/components/AddOnSuggestionModal";
import {
  ItemCustomiseModal,
  type ItemCustomisation,
} from "@/components/ItemCustomiseModal";
import { useCart, type MenuItem } from "@/contexts/CartContext";
import PickLocationModal from "@/components/PickLocationModal";
import LazyImage from "@/components/LazyImage";
import { pickMenuImageUrl } from "@/types";
import type { SiteCategory, StoreLocation } from "@/types";

const DEFAULT_IMG = "/manus-storage/banh-mi-1_9ba4dcf0.jpg";

function getSuggestions(
  item: MenuItem,
  allItems: MenuItem[],
  addOnCategories: Record<string, string[]>,
): SuggestedItem[] {
  const targetCats = addOnCategories[item.category];
  if (!targetCats || targetCats.length === 0) return [];
  const suggestions: SuggestedItem[] = [];
  for (const cat of targetCats) {
    const candidates = allItems.filter(
      (m) => m.category === cat && m.isAvailable && m.id !== item.id,
    );
    if (candidates.length > 0) suggestions.push(candidates[0] as SuggestedItem);
    if (suggestions.length >= 3) break;
  }
  return suggestions.slice(0, 3);
}

type MenuProps = {
  menuItems: MenuItem[];
  storeLocations: StoreLocation[];
  categoriesContent: SiteCategory[];
};

export default function Menu({
  menuItems,
  storeLocations,
  categoriesContent,
}: MenuProps) {
  const t = useTranslations("Menu");
  const locale = useLocale();

  const menuItemPath = useCallback(
    (id: number) =>
      locale === DEFAULT_LOCALE ? `/menu/${id}` : `/${locale}/menu/${id}`,
    [locale],
  );

  const [activeCategory, setActiveCategory] = useState(t("allCategory"));
  const [search, setSearch] = useState("");
  const [addonTrigger, setAddonTrigger] = useState<{
    item: SuggestedItem;
    suggestions: SuggestedItem[];
  } | null>(null);
  const [customiseItem, setCustomiseItem] = useState<MenuItem | null>(null);
  const [pickLocationOpen, setPickLocationOpen] = useState(false);

  // ─── Shared cart ─────────────────────────────────────────────────────────
  const {
    cart,
    cartCount,
    cartTotal,
    setCartOpen,
    addToCart: ctxAddToCart,
    removeFromCart,
  } = useCart();

  const categoryImageMap = useMemo<Record<string, string>>(
    () =>
      categoriesContent.reduce<Record<string, string>>((acc, category) => {
        if (category.imageUrl) acc[category.alias] = category.imageUrl;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const addOnCategoriesMap = useMemo<Record<string, string[]>>(
    () =>
      categoriesContent.reduce<Record<string, string[]>>((acc, category) => {
        acc[category.alias] = category.addon ?? [];
        return acc;
      }, {}),
    [categoriesContent],
  );

  // Build category sort order from sortOrder field on items (set in DB)
  const catOrderMap = new Map<string, number>();
  (menuItems ?? []).forEach((m: MenuItem) => {
    if (!catOrderMap.has(m.category))
      catOrderMap.set(m.category, m.sortOrder ?? 99);
  });
  const rawCats = Array.from(
    new Set((menuItems ?? []).map((m: MenuItem) => m.category)),
  ) as string[];
  const sortedCats = [...rawCats].sort(
    (a: string, b: string) =>
      (catOrderMap.get(a) ?? 99) - (catOrderMap.get(b) ?? 99),
  );

  const allLabel = t("allCategory");
  const categories = [allLabel, ...sortedCats];

  const filtered = (menuItems ?? []).filter((m: MenuItem) => {
    const matchCat =
      activeCategory === allLabel || m.category === activeCategory;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.description ?? "").toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const handleOpenCustomise = useCallback((item: MenuItem) => {
    if (!item.isAvailable) return;
    setCustomiseItem(item);
  }, []);

  const handleCustomiseConfirm = useCallback(
    (customisation: ItemCustomisation) => {
      if (!customiseItem) return;
      ctxAddToCart(customiseItem, customisation, customisation.qty, false);
      setCustomiseItem(null);
      setCartOpen(true);
      const all = menuItems ?? [];
      const suggestions = getSuggestions(
        customiseItem,
        all as MenuItem[],
        addOnCategoriesMap,
      );
      if (suggestions.length > 0) {
        setAddonTrigger({ item: customiseItem as SuggestedItem, suggestions });
      }
    },
    [customiseItem, menuItems, ctxAddToCart, setCartOpen, addOnCategoriesMap],
  );

  const handleQuickAdd = useCallback(
    (item: MenuItem) => {
      if (!item.isAvailable) return;
      ctxAddToCart(item, undefined, 1, false);
    },
    [ctxAddToCart],
  );

  const cartIds = new Set(cart.map((c) => c.item.id));

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Hero */}
      <section className="bg-brand-dark">
        <div className="max-w-[1280px] mx-auto px-6 md:px-16 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-3">
              {t("hero.eyebrow")}
            </p>
            <h1 className="font-serif text-white text-4xl md:text-5xl leading-tight mb-4">
              {t("hero.heading")}
            </h1>
            <p className="text-white/60 text-base leading-relaxed mb-8">
              {t("hero.subheading")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/menu#categories"
                className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-red/90 text-white font-semibold px-6 py-3 transition-colors text-sm"
              >
                {t("hero.ctaMenu")}
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-white/30 hover:border-white/60 text-white font-semibold px-6 py-3 transition-colors text-sm"
              >
                {t("hero.ctaStore")}
              </Link>
              <Link
                href="/stores"
                className="inline-flex items-center gap-2 bg-brand-amber hover:bg-brand-amber/90 text-brand-dark font-semibold px-6 py-3 transition-colors text-sm"
              >
                {t("hero.ctaDelivery")}
              </Link>
            </div>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video md:aspect-[4/3]">
            <video
              src="/manus-storage/saigon-food-hero_53c731c9.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Category strip */}
      <div
        id="categories"
        className="bg-white border-b border-gray-100 sticky top-16 z-40"
      >
        <div className="max-w-[1280px] mx-auto px-6 py-3 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-sm font-semibold transition-colors border ${
                activeCategory === cat
                  ? "bg-brand-red text-white border-brand-red"
                  : "bg-transparent text-brand-dark/60 border-gray-200 hover:border-brand-red/40 hover:text-brand-dark"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <main id="menu-grid" className="max-w-[1280px] mx-auto px-6 py-10">
        {/* Search bar */}
        <div className="relative mb-8 max-w-xl">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder={t("search.placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-10 py-3 border border-gray-200 bg-white text-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/40 transition-colors shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark transition-colors text-xs"
            >
              {t("search.clearLabel")}
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-brand-dark/40">
            <p className="font-serif text-2xl mb-2">
              {search
                ? t("empty.headingSearch", { query: search })
                : t("empty.headingCategory")}
            </p>
            <p className="text-sm">
              {search ? t("empty.hintSearch") : t("empty.hintCategory")}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-4 text-brand-red text-sm font-semibold hover:underline"
              >
                {t("empty.clearSearch")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {(filtered as MenuItem[]).map((item) => {
              const cartEntries = cart.filter((c) => c.item.id === item.id);
              const totalQtyInCart = cartEntries.reduce((s, c) => s + c.qty, 0);
              const lastEntry = cartEntries[cartEntries.length - 1];

              const detailHref = menuItemPath(item.id);

              return (
                <div
                  key={item.id}
                  className={`group bg-white overflow-hidden card-lift ${!item.isAvailable ? "opacity-60" : ""}`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <Link
                      href={detailHref}
                      className="absolute inset-0 z-0 block"
                      aria-label={item.name}
                    >
                      <LazyImage
                        src={
                          pickMenuImageUrl(
                            item.imageUrls,
                            [512, 1024, 1920, 256],
                          ) ??
                          item.imageUrl ??
                          categoryImageMap[item.category] ??
                          DEFAULT_IMG
                        }
                        alt=""
                        wrapperClassName="size-full"
                        className="group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                    {item.isPopular ? (
                      <div className="pointer-events-none absolute top-2 left-2 z-10">
                        <span className="bg-brand-red text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 flex items-center gap-1 shadow-md">
                          {t("card.popularBadge")}
                        </span>
                      </div>
                    ) : null}
                    {!item.isAvailable ? (
                      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/50">
                        <span className="bg-white text-brand-dark text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
                          <AlertCircle size={12} className="text-brand-red" />{" "}
                          {t("card.unavailableBadge")}
                        </span>
                      </div>
                    ) : totalQtyInCart > 0 && lastEntry ? (
                      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-0 overflow-hidden bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => removeFromCart(lastEntry.cartLineId)}
                          className="w-8 h-8 flex items-center justify-center text-brand-dark hover:bg-gray-100 transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-brand-dark">
                          {totalQtyInCart}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenCustomise(item)}
                          className="w-8 h-8 flex items-center justify-center bg-brand-red text-white hover:bg-brand-red/90 transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCustomise(item)}
                        className="absolute bottom-2 right-2 z-10 flex h-9 w-9 items-center justify-center bg-brand-red text-white opacity-0 shadow-lg transition-all hover:bg-brand-red/90 group-hover:opacity-100"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                  <Link
                    href={detailHref}
                    className="block p-4 pb-3 transition-colors hover:bg-brand-cream/50"
                  >
                    <p className="text-[10px] font-bold text-brand-red uppercase tracking-widest mb-1">
                      {item.category}
                    </p>
                    <h3 className="font-serif text-brand-dark text-lg leading-snug mb-1 group-hover:text-brand-red transition-colors">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-brand-dark/50 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </Link>
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
                      <span className="flex-shrink-0 bg-brand-red text-white text-sm font-bold px-3 py-2 rounded-full">
                        ${parseFloat(item.price).toFixed(2)}
                      </span>
                      {totalQtyInCart > 0 && lastEntry ? (
                        <div className="flex items-center gap-0 border border-gray-200 overflow-hidden rounded-full flex-1">
                          <button
                            onClick={() => removeFromCart(lastEntry.cartLineId)}
                            className="w-9 h-9 flex items-center justify-center text-brand-dark hover:bg-gray-100 transition-colors"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="flex-1 text-center text-sm font-bold text-brand-dark">
                            {totalQtyInCart}
                          </span>
                          <button
                            onClick={() => handleOpenCustomise(item)}
                            className="w-9 h-9 flex items-center justify-center bg-brand-red text-white hover:bg-brand-red/90 transition-colors rounded-full"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenCustomise(item)}
                          disabled={!item.isAvailable}
                          className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-bold py-2 rounded-full transition-all duration-300 ${
                            item.isAvailable
                              ? "bg-brand-dark text-white hover:bg-brand-red"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <Plus size={13} /> {t("card.addButton")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Find a store strip */}
        <Link href="/stores">
          <div className="mt-12 flex items-center justify-between bg-brand-dark text-white px-8 py-5 hover:bg-brand-dark/90 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-brand-amber" />
              <div>
                <p className="font-serif text-lg">{t("storeStrip.heading")}</p>
                <p className="text-white/50 text-xs">
                  {t("storeStrip.subheading")}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-white/50" />
          </div>
        </Link>
      </main>

      {/* Pick Location modal */}
      <PickLocationModal
        open={pickLocationOpen}
        onClose={() => setPickLocationOpen(false)}
        stores={storeLocations}
        onSelect={(store) => {
          setPickLocationOpen(false);
          window.location.href = `/checkout?storeId=${store.id}`;
        }}
      />

      {/* Sticky checkout bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-5 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
              onClick={() => setPickLocationOpen(true)}
              className="w-full flex items-center gap-4 bg-brand-red text-white px-5 py-4 rounded-2xl shadow-2xl hover:bg-red-700 active:scale-[0.99] transition-all duration-150"
            >
              <div className="relative shrink-0">
                <ShoppingCart size={26} className="text-white" />
                <span className="absolute -top-2 -right-2 bg-white text-brand-red text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-base leading-tight">
                  {t("checkoutBar.heading")}
                </div>
                <div className="text-white/80 text-sm mt-0.5">
                  {t("checkoutBar.summary", {
                    count: cartCount,
                    total: cartTotal.toFixed(2),
                  })}
                </div>
              </div>
              <ArrowRight size={20} className="text-white/70 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Item customisation modal */}
      {customiseItem && (
        <ItemCustomiseModal
          item={customiseItem}
          onConfirm={handleCustomiseConfirm}
          onClose={() => setCustomiseItem(null)}
        />
      )}

      {/* Add-on suggestion modal */}
      <AddOnSuggestionModal
        triggerItem={addonTrigger?.item ?? null}
        suggestions={addonTrigger?.suggestions ?? []}
        cartIds={cartIds}
        onAdd={(suggestion) => {
          const cartSnapshot = [...cart];
          ctxAddToCart(suggestion as MenuItem, undefined, 1, true);
          setAddonTrigger(null);
          toast.success(t("toast.addonAdded", { name: suggestion.name }), {
            description: t("toast.addonDescription"),
            duration: 5000,
            action: {
              label: t("toast.addonUndo"),
              onClick: () => {
                toast.info(t("toast.addonRemoved", { name: suggestion.name }), {
                  duration: 2500,
                });
              },
            },
          });
        }}
        onClose={() => setAddonTrigger(null)}
      />
    </div>
  );
}
