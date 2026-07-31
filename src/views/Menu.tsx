"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
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
import {
  CATEGORY_LIST_ANCHOR,
  getCategorySectionId,
} from "@/lib/category-list-scroll";
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
import CategorySelect from "@/components/CategorySelect";
import CategorySidebar, {
  CategorySidebarAside,
  CATEGORY_SIDEBAR_COLUMN_CLASS,
} from "@/components/CategorySidebar";
import ProductCatalogPagination from "@/components/ProductCatalogPagination";
import { getActiveCategoryLabel } from "@/lib/category-bar";
import { moveZeroSortOrderToEnd } from "@/lib/sort-order";
import { CategoryIcon } from "@/components/CategoryIcon";
import { pickMenuImageUrl } from "@/types";
import type { SiteCategory, SiteCategoryGroup, StoreLocation } from "@/types";
import { useProductCatalogNavigation } from "@/hooks/useProductCatalogNavigation";
import Image from "next/image";

const DEFAULT_IMG = "/manus-storage/banh-mi-1_9ba4dcf0.jpg";
const MENU_CARD_SIZES =
  "(max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw";

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
  barCategories: SiteCategory[];
  activeCategoryId: number | null;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  initialSearch: string;
};

export default function Menu({
  menuItems,
  storeLocations,
  categoriesContent,
  categoryGroups,
  barCategories,
  activeCategoryId,
  page,
  totalPages,
  initialSearch,
}: MenuProps) {
  const t = useTranslations("Menu");
  const locale = useLocale();

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const allLabel = t("allCategory");
  const urlCategory = searchParams.get("category");

  const menuItemPath = useCallback(
    (item: MenuItem) => menuItemDetailPath(item, locale),
    [locale],
  );

  const activeCategoryLabel = getActiveCategoryLabel(
    activeCategoryId,
    allLabel,
    categoriesContent,
  );
  const {
    search,
    setSearch,
    handleCategorySelect,
    handlePageChange,
    clearSearch,
  } = useProductCatalogNavigation({
    categories: categoriesContent,
    activeCategoryId,
    initialSearch,
    page,
  });
  const [addonTrigger, setAddonTrigger] = useState<{
    item: SuggestedItem;
    suggestions: SuggestedItem[];
  } | null>(null);
  const [customiseItem, setCustomiseItem] = useState<MenuItem | null>(null);
  const [pickLocationOpen, setPickLocationOpen] = useState(false);
  const [orderLocationsOpen, setOrderLocationsOpen] = useState(false);

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
  }, [urlCategory, pathname]);

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

  const categoryIconMap = useMemo<Record<number, string | null>>(
    () =>
      categoriesContent.reduce<Record<number, string | null>>((acc, category) => {
        acc[category.id] = category.icon;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const categoryDescriptionMap = useMemo(
    () =>
      categoriesContent.reduce<Record<number, string>>((acc, category) => {
        const description = category.description?.trim();
        if (description) acc[category.id] = description;
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

  const activeCategoryDescription =
    activeCategoryId != null
      ? categoryDescriptionMap[activeCategoryId]
      : undefined;

  const filtered = useMemo(
    () => moveZeroSortOrderToEnd(menuItems ?? [], (item) => item.sortOrder),
    [menuItems],
  );
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

  const getCategoryIcon = (categoryId: number | null) =>
    categoryId == null ? null : categoryIconMap[categoryId] ?? null;

  const getCategoryIconFallback = (categoryId: number | null): "all" | "category" =>
    categoryId == null ? "all" : "category";

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Hero */}
      <section className="relative aspect-[5/1] overflow-hidden min-h-[500px] w-full xl:min-h-[400px] flex justify-start items-end">
        {/* use Next/Image for this */}
        <Image
          src="/manus-storage/menu__hero.png"
          alt={t("hero.heading")}
          fill
          priority
          className="absolute inset-0 object-cover w-full h-full object-[70%_35%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="w-full mx-auto px-6 lg:px-16 gap-10 pb-8 md:pb-12 lg:pb-16">
          <div className="relative z-10 h-full flex flex-col items-start justify-center px-6 lg:px-20 max-w-[1280px] md:max-w-2xl mx-auto md: ml-4 lg:ml-12 xl:ml-20">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-3">
              {t("hero.eyebrow")}
            </p>
            <h1 className="font-serif text-white text-4xl lg:text-5xl leading-tight mb-4">
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
        </div>
      </section>

      <div id={MENU_CATEGORIES_ANCHOR} className="scroll-mt-20" aria-hidden />

      {/* Mobile category select */}
      <div className="sticky top-16 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="max-w-[1280px] mx-auto px-6 py-3">
          <CategorySelect
            allLabel={allLabel}
            activeCategoryId={activeCategoryId}
            onCategorySelect={handleCategorySelect}
            categories={barCategories}
            categoryGroups={categoryGroups}
            label={t("categories.label")}
            placeholder={t("categories.placeholder")}
            searchPlaceholder={t("categories.searchPlaceholder")}
            emptyMessage={t("categories.empty")}
            getCategoryIcon={getCategoryIcon}
            getCategoryIconFallback={getCategoryIconFallback}
            showAllOption={false}
          />
        </div>
      </div>

      <div className="lg:flex lg:items-start">
        <div className={CATEGORY_SIDEBAR_COLUMN_CLASS}>
          <CategorySidebarAside aria-label={t("categories.label")}>
            <CategorySidebar
              allLabel={allLabel}
              activeCategoryId={activeCategoryId}
              onCategorySelect={handleCategorySelect}
              categories={barCategories}
              categoryGroups={categoryGroups}
              showAllOption={false}
              renderCategoryLeading={(category) => (
                <CategoryIcon
                  icon={getCategoryIcon(category.id)}
                  fallback={getCategoryIconFallback(category.id)}
                  accent
                  className="size-5 shrink-0 text-base"
                  fallbackClassName="size-3.5"
                />
              )}
            />
          </CategorySidebarAside>
        </div>

        {/* Grid */}
        <main
          id="menu-grid"
          className="min-w-0 flex-1 w-full mx-auto px-6 py-10"
        >
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
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark transition-colors text-xs"
            >
              {t("search.clearLabel")}
            </button>
          )}
        </div>

        <div id={CATEGORY_LIST_ANCHOR} className="scroll-mt-24" aria-hidden />

        {activeCategoryId != null ? (
          <div
            id={getCategorySectionId(activeCategoryId)}
            className="scroll-mt-24 mb-6"
          >
            <h2 className="font-serif text-brand-dark text-2xl mb-3 pb-2 border-b border-brand-cream">
              {activeCategoryLabel}
            </h2>
            {activeCategoryDescription ? (
              <p className="text-sm leading-relaxed text-brand-dark/55">
                {activeCategoryDescription}
              </p>
            ) : null}
          </div>
        ) : null}

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
                onClick={clearSearch}
                className="mt-4 text-brand-red text-sm font-semibold hover:underline"
              >
                {t("empty.clearSearch")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-5 xl:gap-6">
            {filtered.map((item) => {
              const cartEntries = cart.filter((c) => c.item.id === item.id);
              const totalQtyInCart = cartEntries.reduce((s, c) => s + c.qty, 0);
              const lastEntry = cartEntries[cartEntries.length - 1];

              const detailHref = menuItemPath(item);

              return (
                <div
                  key={item.id}
                  className={`flex flex-direction-column group overflow-hidden bg-white card-lift ${!item.isAvailable ? "opacity-60" : ""}`}
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
                        sizes={MENU_CARD_SIZES}
                        unmountWhenHidden
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

        <ProductCatalogPagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />

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
      </div>

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
