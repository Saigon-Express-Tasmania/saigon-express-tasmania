"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
import { menuItemDetailPath, MENU_CATEGORIES_ANCHOR } from "@/lib/menu-item-routes";
import AddOnSuggestionModal, {
  type SuggestedItem,
} from "@/components/AddOnSuggestionModal";
import {
  ItemCustomiseModal,
  type ItemCustomisation,
} from "@/components/ItemCustomiseModal";
import { useCart, type MenuItem } from "@/contexts/CartContext";
import PickLocationModal from "@/components/PickLocationModal";
import StoreLocationsDialog from "@/components/StoreLocationsDialog";
import LazyImage from "@/components/LazyImage";
import FoodContentLabels from "@/components/FoodContentLabels";
import CategoryGroupBar from "@/components/CategoryGroupBar";
import {
  filterCategoriesWithItems,
  getPopulatedCategoryIds,
} from "@/lib/category-bar";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Label } from "@/components/ui/label";
import { pickMenuImageUrl } from "@/types";
import type { SiteCategory, SiteCategoryGroup, StoreLocation } from "@/types";
// 1. Import Fuse
import Fuse from "fuse.js";

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
  categoryGroups: SiteCategoryGroup[];
};

export default function Menu({
  menuItems,
  storeLocations,
  categoriesContent,
  categoryGroups,
}: MenuProps) {
  const t = useTranslations("Menu");
  const locale = useLocale();

  // Initialize Next.js navigation hooks
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const allLabel = t("allCategory");
  const urlCategory = searchParams.get("category");

  const menuItemPath = useCallback(
    (item: MenuItem) => menuItemDetailPath(item, locale),
    [locale],
  );

  // Set initial state from URL, fallback to allLabel
  const [activeCategory, setActiveCategory] = useState(urlCategory || allLabel);
  const [search, setSearch] = useState("");
  const [addonTrigger, setAddonTrigger] = useState<{
    item: SuggestedItem;
    suggestions: SuggestedItem[];
  } | null>(null);
  const [customiseItem, setCustomiseItem] = useState<MenuItem | null>(null);
  const [pickLocationOpen, setPickLocationOpen] = useState(false);
  const [orderLocationsOpen, setOrderLocationsOpen] = useState(false);

  // Handle category clicks by updating state AND the URL
  const handleCategoryClick = useCallback(
    (cat: string) => {
      setActiveCategory(cat);

      // Update the URL search parameters seamlessly
      const params = new URLSearchParams(searchParams.toString());
      if (cat === allLabel) {
        params.delete("category");
      } else {
        params.set("category", cat);
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router, allLabel],
  );

  useEffect(() => {
    if (!urlCategory) {
      setActiveCategory(allLabel);
      return;
    }

    const matched = categoriesContent.find(
      (category) => category.name === urlCategory,
    );
    setActiveCategory(matched ? urlCategory : allLabel);
  }, [urlCategory, categoriesContent, allLabel]);

  useEffect(() => {
    const scrollToCategories = () => {
      if (window.location.hash !== `#${MENU_CATEGORIES_ANCHOR}`) return;
      requestAnimationFrame(() => {
        document.getElementById(MENU_CATEGORIES_ANCHOR)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };

    scrollToCategories();
    window.addEventListener("hashchange", scrollToCategories);
    return () => window.removeEventListener("hashchange", scrollToCategories);
  }, [urlCategory]);

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
        if (category.imageUrl) acc[category.name] = category.imageUrl;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const categoryIconMap = useMemo<Record<string, string | null>>(
    () =>
      categoriesContent.reduce<Record<string, string | null>>((acc, category) => {
        acc[category.name] = category.icon;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const addOnCategoriesMap = useMemo<Record<string, string[]>>(
    () =>
      categoriesContent.reduce<Record<string, string[]>>((acc, category) => {
        acc[category.name] = category.addon ?? [];
        return acc;
      }, {}),
    [categoriesContent],
  );

  const activeCategoryId = useMemo(() => {
    if (activeCategory === allLabel) return null;
    return (
      categoriesContent.find((category) => category.name === activeCategory)
        ?.id ?? null
    );
  }, [activeCategory, allLabel, categoriesContent]);

  const barCategories = useMemo(() => {
    const populatedCategoryIds = getPopulatedCategoryIds(menuItems);
    return filterCategoriesWithItems(categoriesContent, populatedCategoryIds);
  }, [categoriesContent, menuItems]);

  // 2. Initialize Fuse instance with configuration keys and thresholds
  const fuse = useMemo(() => {
    const options = {
      keys: [
        { name: "name", weight: 0.6 },
        { name: "description", weight: 0.3 },
        { name: "category", weight: 0.1 },
      ],
      threshold: 0.35, // Low numbers = strict match, high numbers = loose match. 0.35 is great for food items.
      keysWidth: true,
    };

    return new Fuse(menuItems ?? [], options);
  }, [menuItems]);

  // 3. Compute filtered list utilizing Fuse if query is present
  const filtered = useMemo(() => {
    const q = search.trim();

    // First, filter by category if a specific one is selected
    let baseItems = menuItems ?? [];
    if (activeCategoryId != null) {
      baseItems = baseItems.filter((m) => m.categoryId === activeCategoryId);
    }

    if (!q) return baseItems;

    // If activeCategory is specific, we temporarily search within those specific items
    // or instantiate fuse dynamically. For high performance, we query the precomputed global fuse instance
    // and just filter the results against the category selection.
    const searchResults = fuse.search(q).map((result) => result.item);

    if (activeCategoryId != null) {
      return searchResults.filter((m) => m.categoryId === activeCategoryId);
    }

    return searchResults;
  }, [search, activeCategoryId, menuItems, fuse]);

  const handleOpenCustomise = useCallback((item: MenuItem) => {
    if (!item.isAvailable) return;
    setCustomiseItem(item);
  }, []);

  const handleOrderNow = useCallback((item: MenuItem) => {
    if (!item.isAvailable) return;
    setOrderLocationsOpen(true);
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

  const getCategoryIcon = (categoryName: string) =>
    categoryName === allLabel ? null : categoryIconMap[categoryName];

  const getCategoryIconFallback = (categoryName: string): "all" | "category" =>
    categoryName === allLabel ? "all" : "category";

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Hero */}
      <section className="relative aspect-[5/1.6] overflow-hidden min-h-[500px] w-full">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/manus-storage/menu__hero.jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="w-full h-full mx-auto px-6 md:px-16 py-12 md:py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div className="relative z-10 h-full flex flex-col items-start justify-center px-6 md:px-20 max-w-[1280px] mx-auto">
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
        id={MENU_CATEGORIES_ANCHOR}
        className="sticky top-16 z-40 scroll-mt-20 border-b border-gray-100 bg-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)]"
      >
        <div className="max-w-[1280px] mx-auto px-6 py-3">
          <Label className="mb-2 block text-xs font-bold uppercase tracking-wider text-brand-dark/60 md:sr-only">
            {t("categories.label")}
          </Label>
          <CategoryGroupBar
            allLabel={allLabel}
            activeCategory={activeCategory}
            onCategorySelect={handleCategoryClick}
            categories={barCategories}
            categoryGroups={categoryGroups}
            variant="brand"
            renderCategoryLeading={(category) => (
              <CategoryIcon
                icon={getCategoryIcon(category.name)}
                fallback={getCategoryIconFallback(category.name)}
                accent
                className="size-6 shrink-0 text-lg"
                fallbackClassName="size-4"
              />
            )}
          />
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
            {filtered.map((item) => {
              const cartEntries = cart.filter((c) => c.item.id === item.id);
              const totalQtyInCart = cartEntries.reduce((s, c) => s + c.qty, 0);
              const lastEntry = cartEntries[cartEntries.length - 1];

              const detailHref = menuItemPath(item);

              return (
                <div
                  key={item.id}
                  className={`flex flex-direction-column group bg-white overflow-hidden card-lift ${!item.isAvailable ? "opacity-60" : ""}`}
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
                    <div className="pointer-events-none absolute top-2 right-2 z-10 flex w-max flex-col items-stretch gap-1">
                      {item.isPopular ? (
                        <span className="block w-full bg-brand-red text-center text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-md">
                          {t("card.popularBadge")}
                        </span>
                      ) : null}
                      {item.energy != null && item.energy > 0 ? (
                        <span className="block w-full bg-brand-dark text-center text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-md">
                          {t("card.energyBadge", { value: item.energy })}
                        </span>
                      ) : null}
                    </div>
                    {!item.isAvailable ? (
                      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/50">
                        <span className="bg-white text-brand-dark text-xs font-bold px-3 py-1.5 flex items-center gap-1.5">
                          <AlertCircle size={12} className="text-brand-red" />{" "}
                          {t("card.unavailableBadge")}
                        </span>
                      </div>
                    ) : null}
                    <FoodContentLabels
                      foodContent={item.foodContent}
                      className={`pointer-events-none absolute bottom-2 left-2 z-10 ${
                        item.isAvailable && totalQtyInCart > 0 && lastEntry
                          ? "max-w-[calc(100%-4.5rem)]"
                          : "max-w-[calc(100%-1rem)]"
                      }`}
                    />
                    {item.isAvailable && totalQtyInCart > 0 && lastEntry ? (
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
                      </div>
                    ) : null}
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
                  <div className="flex-1" />
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
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
                        <>
                          <button
                            onClick={() => handleOrderNow(item)}
                            disabled={!item.isAvailable}
                            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-bold py-2 rounded-full transition-all duration-300 ${
                              item.isAvailable
                                ? "bg-brand-amber text-white hover:bg-brand-amber/90"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            Order Now
                          </button>
                        </>
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

      {/* Order location picker (compact store list) */}
      <StoreLocationsDialog
        open={orderLocationsOpen}
        onClose={() => setOrderLocationsOpen(false)}
        stores={storeLocations}
      />

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
