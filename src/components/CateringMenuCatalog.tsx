"use client";

import Link from "@/components/link";
import CateringPackOrderButton from "@/components/CateringPackOrderButton";
import CateringTierSelect from "@/components/CateringTierSelect";
import CategorySelect from "@/components/CategorySelect";
import CategorySidebar, {
  CategorySidebarAside,
  CATEGORY_SIDEBAR_COLUMN_CLASS,
} from "@/components/CategorySidebar";
import { CategoryIcon } from "@/components/CategoryIcon";
import LazyImage from "@/components/LazyImage";
import ProductCatalogPagination from "@/components/ProductCatalogPagination";
import ProductCatalogPendingState from "@/components/ProductCatalogPendingState";
import { getActiveCategoryLabel } from "@/lib/category-bar";
import {
  CATERING_CATEGORIES_ANCHOR,
  cateringItemDetailPath,
} from "@/lib/catering-item-routes";
import {
  formatCateringPackCardPriceLabel,
  parseCateringPrice,
} from "@/lib/catering-price";
import {
  CATEGORY_LIST_ANCHOR,
  getCategorySectionId,
} from "@/lib/category-list-scroll";
import type {
  CateringPack,
  CateringTierPrice,
} from "@/lib/supabase/catering-packs";
import type { SiteCategory, SiteCategoryGroup } from "@/types";
import { useProductCatalogNavigation } from "@/hooks/useProductCatalogNavigation";
import { ChevronRight, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

const CATERING_MENU_CARD_SIZES =
  "(max-width: 1024px) 50vw, (max-width: 1280px) 50vw, (max-width: 1536px) 33vw, 25vw";

type CateringMenuCatalogProps = {
  packs: CateringPack[];
  categoriesContent: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
  barCategories: SiteCategory[];
  activeCategoryId: number | null;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  initialSearch: string;
  onAddToOrder: (pack: CateringPack, tier: CateringTierPrice | null) => void;
  onEnquire?: (itemName: string, price: string) => void;
  locale?: string;
  syncCategoryToUrl?: boolean;
  addDisabled?: boolean;
  stickyTopClass?: string;
  showProteinNote?: boolean;
};

export default function CateringMenuCatalog({
  packs,
  categoriesContent,
  categoryGroups,
  barCategories,
  activeCategoryId,
  page,
  totalPages,
  initialSearch,
  onAddToOrder,
  onEnquire,
  locale,
  addDisabled = false,
  stickyTopClass = "top-16",
  showProteinNote = false,
}: CateringMenuCatalogProps) {
  const t = useTranslations("Catering");
  const allLabel = t("menu.allCategory");
  const [tierSelection, setTierSelection] = useState<Record<number, number>>(
    {},
  );

  const {
    search,
    setSearch,
    isPending,
    displayCategoryId,
    handleCategorySelect,
    handlePageChange,
    prefetchCategory,
    clearSearch,
  } = useProductCatalogNavigation({
    categories: categoriesContent,
    activeCategoryId,
    initialSearch,
    page,
    totalPages,
  });

  const displayCategoryLabel = getActiveCategoryLabel(
    displayCategoryId,
    allLabel,
    categoriesContent,
  );

  const categoryIconMap = useMemo(
    () =>
      categoriesContent.reduce<Record<number, string | null>>((acc, category) => {
        acc[category.id] = category.icon;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const getCategoryIcon = useCallback(
    (categoryId: number | null) =>
      categoryId == null ? null : categoryIconMap[categoryId] ?? null,
    [categoryIconMap],
  );

  const getCategoryIconFallback = useCallback(
    (categoryId: number | null): "all" | "category" =>
      categoryId == null ? "all" : "category",
    [],
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

  const activeCategoryDescription =
    displayCategoryId != null
      ? categoryDescriptionMap[displayCategoryId]
      : undefined;

  if (barCategories.length === 0 && packs.length === 0 && !search.trim()) {
    return (
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center text-sm text-brand-dark/55 py-6">
          {t("menu.empty")}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        id={CATERING_CATEGORIES_ANCHOR}
        className="scroll-mt-20"
        aria-hidden
      />

      <div
        className={`sticky ${stickyTopClass} z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] lg:hidden`}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-3">
          <CategorySelect
            allLabel={allLabel}
            activeCategoryId={displayCategoryId}
            onCategorySelect={handleCategorySelect}
            onCategoryPrefetch={prefetchCategory}
            categories={barCategories}
            categoryGroups={categoryGroups}
            label={t("menu.categories.label")}
            placeholder={t("menu.categories.placeholder")}
            searchPlaceholder={t("menu.categories.searchPlaceholder")}
            emptyMessage={t("menu.categories.empty")}
            getCategoryIcon={getCategoryIcon}
            getCategoryIconFallback={getCategoryIconFallback}
            variant="brand"
            showAllOption={false}
          />
        </div>
      </div>

      <div className="lg:flex lg:items-start">
        <div className={CATEGORY_SIDEBAR_COLUMN_CLASS}>
          <CategorySidebarAside
            aria-label={t("menu.categories.label")}
            variant="brand"
          >
            <CategorySidebar
              allLabel={allLabel}
              activeCategoryId={displayCategoryId}
              onCategorySelect={handleCategorySelect}
              onCategoryPrefetch={prefetchCategory}
              categories={barCategories}
              categoryGroups={categoryGroups}
              variant="brand"
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

        <div className="min-w-0 flex-1 w-full mx-auto px-6">
          <div className="relative mt-8 mb-8 max-w-xl">
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
              placeholder={t("menu.search.placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 border border-gray-200 bg-white text-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/40 transition-colors shadow-sm"
            />
            {search ? (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark transition-colors text-xs"
              >
                {t("menu.search.clearLabel")}
              </button>
            ) : null}
          </div>

          <div id={CATEGORY_LIST_ANCHOR} className="scroll-mt-24" aria-hidden />

          {displayCategoryId != null ? (
            <div
              id={getCategorySectionId(displayCategoryId)}
              className="scroll-mt-24 mb-6"
            >
              <h3 className="font-serif text-brand-dark text-2xl mb-3 pb-2 border-b border-brand-cream">
                {displayCategoryLabel}
              </h3>
              {activeCategoryDescription ? (
                <p className="text-sm leading-relaxed text-brand-dark/55">
                  {activeCategoryDescription}
                </p>
              ) : null}
            </div>
          ) : null}

          <ProductCatalogPendingState
            isPending={isPending}
            skeletonCount={8}
            imageAspectClass="aspect-square"
            gridClassName="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 xl:gap-6 2xl:grid-cols-4 mb-10"
          >
          {packs.length === 0 ? (
            <div className="text-center py-12 text-brand-dark/55">
              <p className="font-serif text-2xl mb-2 text-brand-dark/70">
                {search.trim()
                  ? t("menu.emptySearch.heading", { query: search.trim() })
                  : t("menu.emptyCategory")}
              </p>
              {search.trim() ? (
                <>
                  <p className="text-sm">{t("menu.emptySearch.hint")}</p>
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="mt-4 text-brand-red text-sm font-semibold hover:underline"
                  >
                    {t("menu.emptySearch.clearSearch")}
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-4 xl:gap-6 mb-10">
              {packs.map((item) => {
                const selectedTierIndex = tierSelection[item.id] ?? 0;
                const selectedTier = item.prices[selectedTierIndex] ?? null;
                const hasTierPricing = item.prices.length > 0;
                const hasOrderPrice = hasTierPricing
                  ? parseCateringPrice(
                      selectedTier?.price ?? item.prices[0]?.price,
                    ) != null
                  : parseCateringPrice(item.price) != null;

                const cardPriceLabel = formatCateringPackCardPriceLabel(
                  item.price,
                  item.prices.map((tier) => tier.price),
                );

                const itemHref =
                  locale != null
                    ? cateringItemDetailPath(item, locale)
                    : null;

                return (
                  <div
                    key={item.id}
                    className="bg-brand-cream overflow-hidden hover:shadow-md transition-shadow duration-300 group flex flex-col h-full"
                  >
                    {itemHref ? (
                      <Link href={itemHref} className="block">
                        <div className="relative aspect-square overflow-hidden">
                          <LazyImage
                            src={item.img ?? "/placeholder.svg"}
                            alt={item.name}
                            wrapperClassName="size-full"
                            sizes={CATERING_MENU_CARD_SIZES}
                            unmountWhenHidden
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {cardPriceLabel ? (
                            <div
                              className={`pointer-events-none absolute top-3 right-3 z-10 max-w-[calc(100%-1.5rem)] bg-brand-red px-2.5 py-1 text-right font-bold text-white shadow-sm ${
                                item.prices.length > 1 ? "text-xs" : "text-sm"
                              }`}
                            >
                              {cardPriceLabel}
                            </div>
                          ) : null}
                        </div>
                        <div className="p-5 pb-0">
                          <h4 className="font-serif text-brand-dark text-xl mb-1 group-hover:text-brand-red transition-colors">
                            {item.name}
                          </h4>
                        </div>
                      </Link>
                    ) : (
                      <>
                        <div className="relative aspect-square overflow-hidden">
                          <LazyImage
                            src={item.img ?? "/placeholder.svg"}
                            alt={item.name}
                            wrapperClassName="size-full"
                            sizes={CATERING_MENU_CARD_SIZES}
                            unmountWhenHidden
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {cardPriceLabel ? (
                            <div
                              className={`pointer-events-none absolute top-3 right-3 z-10 max-w-[calc(100%-1.5rem)] bg-brand-red px-2.5 py-1 text-right font-bold text-white shadow-sm ${
                                item.prices.length > 1 ? "text-xs" : "text-sm"
                              }`}
                            >
                              {cardPriceLabel}
                            </div>
                          ) : null}
                        </div>
                        <div className="p-5 pb-0">
                          <h4 className="font-serif text-brand-dark text-xl mb-1">
                            {item.name}
                          </h4>
                        </div>
                      </>
                    )}
                    <div className="p-5 pt-2 flex flex-col flex-1">
                      {item.serves ? (
                        <p className="text-xs text-brand-red font-semibold mb-3 flex items-center gap-1">
                          <Users size={11} />{" "}
                          {t("menu.caters", { serves: item.serves })}
                        </p>
                      ) : null}
                      {item.note ? (
                        <p className="mb-2 text-xs italic text-brand-dark/50 line-clamp-4 leading-relaxed">
                          {item.note}
                        </p>
                      ) : null}
                      {item.includes.length > 0 ? (
                        <ul className="space-y-1 mb-4">
                          {item.includes.map((inc, j) => (
                            <li
                              key={j}
                              className="text-xs text-brand-dark/65 flex items-start gap-1.5"
                            >
                              <span className="w-1 h-1 rounded-full bg-brand-red mt-1.5 flex-shrink-0" />
                              {inc}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-auto flex flex-col gap-3 pt-4">
                        {item.prices.length > 0 ? (
                          <CateringTierSelect
                            id={`catering-tier-${item.id}`}
                            tiers={item.prices}
                            value={selectedTierIndex}
                            onValueChange={(index) =>
                              setTierSelection((prev) => ({
                                ...prev,
                                [item.id]: index,
                              }))
                            }
                            label={t("menu.sizeLabel")}
                            variant="light"
                          />
                        ) : null}
                        {hasOrderPrice ? (
                          <CateringPackOrderButton
                            pack={item}
                            selectedTier={selectedTier}
                            onAdd={() => onAddToOrder(item, selectedTier)}
                            orderLabel={t("menu.addToOrder")}
                            quoteLabel={t("menu.customPrice")}
                            disabled={addDisabled}
                          />
                        ) : onEnquire ? (
                          <button
                            type="button"
                            onClick={() =>
                              onEnquire(
                                item.name,
                                item.price ??
                                  item.prices[0]?.price ??
                                  t("menu.customPrice"),
                              )
                            }
                            className="w-full bg-brand-red text-white text-xs font-bold py-2.5 px-4 hover:bg-brand-red/90 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {t("menu.enquire")} <ChevronRight size={13} />
                          </button>
                        ) : (
                          <CateringPackOrderButton
                            pack={item}
                            selectedTier={selectedTier}
                            onAdd={() => onAddToOrder(item, selectedTier)}
                            orderLabel={t("menu.addToOrder")}
                            quoteLabel={t("menu.customPrice")}
                            disabled={addDisabled}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </ProductCatalogPendingState>

          <ProductCatalogPagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            disabled={isPending}
          />

          {showProteinNote ? (
            <div className="bg-brand-dark text-white p-6 text-center">
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-2">
                {t("menu.proteinLabel")}
              </p>
              <p className="text-white/80 text-sm">{t("menu.proteinList")}</p>
              <p className="text-white/50 text-xs mt-2">
                {t("menu.proteinNote")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
