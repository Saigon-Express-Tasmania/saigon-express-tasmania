"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import LazyImage from "@/components/LazyImage";
import { motion } from "framer-motion";
import { ChevronRight, Search, Lock, Package, CheckCircle } from "lucide-react";
import Link from "@/components/link";
import { useSupabase } from "@/hooks/useSupabase";
import { useRedirectWholesaleMembersToShop } from "@/hooks/useRedirectWholesaleMembersToShop";
import { cn } from "@/lib/utils";
import { moveZeroSortOrderToEnd } from "@/lib/sort-order";
import { productMatchesCategory } from "@/lib/product-categories";
import {
  CATEGORY_LIST_ANCHOR,
  getCategorySectionId,
  scrollToCategoryInList,
} from "@/lib/category-list-scroll";
import { hasPrivilege } from "@/lib/privileges";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  SiteCategory,
  WholesalePricingTier,
  WholesaleProduct,
} from "@/types";
import {
  formatTierDiscountValue,
  formatTierMinValue,
  pickWholesaleImageUrl,
} from "@/types";
// 1. Import Fuse
import Fuse from "fuse.js";
import CategorySelect from "@/components/CategorySelect";
import CategorySidebar, {
  CategorySidebarAside,
  CATEGORY_SIDEBAR_COLUMN_CLASS,
} from "@/components/CategorySidebar";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  buildMenuCategoryQueryFromId,
  resolveMenuCategoryFromUrlParam,
} from "@/lib/menu-category-url";
import {
  filterCategoriesWithItems,
  getActiveCategoryLabel,
  getPopulatedCategoryIds,
} from "@/lib/category-bar";
import type { SiteCategoryGroup } from "@/types";

const ALL_CATEGORY = "All";
const WHOLESALE_CARD_SIZES =
  "(max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw";

export default function WholesaleLandingShop({
  products,
  categoriesContent,
  categoryGroups,
  pricingTiers,
}: {
  products: WholesaleProduct[];
  categoriesContent: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
  pricingTiers: WholesalePricingTier[];
}) {
  const t = useTranslations("WholesaleShop");

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlCategory = searchParams.get("category");

  useRedirectWholesaleMembersToShop();
  const { isSignedIn, authMetadata } = useSupabase();
  const canViewPrices =
    isSignedIn && hasPrivilege(authMetadata.privileges, "wholesale");

  const bannerPerks = (t.raw("banner.perks") || []) as string[];

  const barCategories = useMemo(() => {
    const populatedCategoryIds = getPopulatedCategoryIds(products);
    return filterCategoriesWithItems(categoriesContent, populatedCategoryIds);
  }, [categoriesContent, products]);

  const resolvedUrlCategory = useMemo(
    () => resolveMenuCategoryFromUrlParam(urlCategory, categoriesContent),
    [urlCategory, categoriesContent],
  );
  const selectedCategoryId = resolvedUrlCategory?.id ?? null;
  const selectedCategoryLabel = getActiveCategoryLabel(
    selectedCategoryId,
    ALL_CATEGORY,
    categoriesContent,
  );

  const categoryStyleMap = useMemo(
    () =>
      categoriesContent.reduce<Record<string, string>>((acc, category) => {
        if (category.style) acc[category.name] = category.style;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const categoryIconMap = useMemo(
    () =>
      categoriesContent.reduce<Record<number, string>>((acc, category) => {
        if (category.icon) acc[category.id] = category.icon;
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

  const [search, setSearch] = useState("");

  const handleCategoryClick = useCallback(
    (categoryId: number | null) => {
      const query = buildMenuCategoryQueryFromId(categoryId, categoriesContent);
      const nextUrl = query ? `${pathname}?${query}` : pathname;
      router.replace(nextUrl, { scroll: false });
      scrollToCategoryInList(categoryId);
    },
    [pathname, router, categoriesContent],
  );

  useEffect(() => {
    if (urlCategory && resolvedUrlCategory && urlCategory !== resolvedUrlCategory.alias) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("category", resolvedUrlCategory.alias);
      const query = params.toString();
      router.replace(
        query ? `${pathname}?${query}` : pathname,
        { scroll: false },
      );
    }
  }, [urlCategory, resolvedUrlCategory, searchParams, pathname, router]);

  // 2. Initialize Fuse instance with targeted keys and fine-tuned thresholds
  const fuse = useMemo(() => {
    const options = {
      keys: [
        { name: "name", weight: 0.6 },
        { name: "description", weight: 0.3 },
        { name: "category", weight: 0.1 },
      ],
      threshold: 0.35, // Balanced threshold: perfect for picking up technical/ingredient typos without returning junk matches.
    };
    return new Fuse(products ?? [], options);
  }, [products]);

  const selectedCategoryDescription =
    selectedCategoryId != null
      ? categoryDescriptionMap[selectedCategoryId]
      : undefined;

  // 3. Compute fuzzy matching coupled with category constraints using useMemo
  const filtered = useMemo(() => {
    const normalizedSearch = search.trim();

    // If there is no search phrase, simply filter down raw data based on category mapping
    if (!normalizedSearch) {
      if (selectedCategoryId === null) {
        return moveZeroSortOrderToEnd(products ?? [], (item) => item.sortOrder);
      }
      return moveZeroSortOrderToEnd(
        (products ?? []).filter((p) =>
          productMatchesCategory(p, selectedCategoryId),
        ),
        (item) => item.sortOrder,
      );
    }

    // Query across the indexed global data subset
    const searchResults = fuse
      .search(normalizedSearch)
      .map((result) => result.item);

    // Apply category isolation on top of search hits
    if (selectedCategoryId !== null) {
      return moveZeroSortOrderToEnd(
        searchResults.filter((p) =>
          productMatchesCategory(p, selectedCategoryId),
        ),
        (item) => item.sortOrder,
      );
    }

    return moveZeroSortOrderToEnd(searchResults, (item) => item.sortOrder);
  }, [search, selectedCategoryId, products, fuse]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Page header */}
      <section className="py-16 border-b border-border/40 bg-background">
        <div className="container">
          <h1 className="font-serif text-5xl lg:text-6xl font-bold text-foreground mb-3">
            {t("header.title")}
          </h1>
          <p className="text-muted-foreground text-lg">{t("header.desc")}</p>
        </div>
      </section>

      {/* Wholesale members banner */}
      <section className="py-0">
        <div className="container py-5">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-black" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-7">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-white text-lg mb-1">
                    {t("banner.title")}
                  </div>
                  <p className="text-white/65 text-sm max-w-md">
                    {t("banner.desc")}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/55">
                    {bannerPerks.map((perk, idx) => (
                      <span key={idx} className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />{" "}
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Link href="/member">
                <button className="shrink-0 flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap">
                  {t("banner.cta")} <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PIN entry notice */}
      <section className="py-3">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 rounded-xl border border-primary/25 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">
                  {t("notice.title")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("notice.desc")}
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/member">
                <button className="text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                  {t("notice.ctaRegister")}
                </button>
              </Link>
              {/* <Link href="/member">
                <button className="text-xs font-semibold px-4 py-2 rounded-lg border border-border hover:border-primary/40 transition-colors">
                  {t("notice.ctaPin")}
                </button>
              </Link> */}
            </div>
          </div>
        </div>
      </section>

      {/* Search + product grid */}
      <section className="py-8">
        <div id="wholesale-categories" className="scroll-mt-20" aria-hidden />

        <div className="sticky top-16 z-40 border-b border-border/60 bg-background/95 backdrop-blur-sm shadow-sm lg:hidden">
          <div className="container py-3">
            <CategorySelect
              allLabel={ALL_CATEGORY}
              activeCategoryId={selectedCategoryId}
              onCategorySelect={handleCategoryClick}
              categories={barCategories}
              categoryGroups={categoryGroups}
              label={t("categories.label")}
              placeholder={t("categories.placeholder")}
              searchPlaceholder={t("categories.searchPlaceholder")}
              emptyMessage={t("categories.empty")}
              getCategoryIcon={getCategoryIcon}
              getCategoryIconFallback={getCategoryIconFallback}
              variant="wholesale"
            />
          </div>
        </div>

        <div className="lg:flex lg:items-start">
          <div className={CATEGORY_SIDEBAR_COLUMN_CLASS}>
            <CategorySidebarAside
              aria-label={t("categories.label")}
              variant="wholesale"
            >
              <CategorySidebar
                allLabel={ALL_CATEGORY}
                activeCategoryId={selectedCategoryId}
                onCategorySelect={handleCategoryClick}
                categories={barCategories}
                categoryGroups={categoryGroups}
                variant="wholesale"
                renderCategoryLeading={(category) => (
                  <CategoryIcon
                    icon={getCategoryIcon(category.id)}
                    fallback={getCategoryIconFallback(category.id)}
                    className="size-5 shrink-0 text-base"
                    fallbackClassName="size-3.5"
                  />
                )}
              />
            </CategorySidebarAside>
          </div>

          <div className="min-w-0 flex-1">
        <div className="px-6">
          {/* Search bar */}
          <div className="relative mb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("search.placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("search.clear")}
              </button>
            )}
          </div>

          <div className="mb-2 flex justify-end">
            <span className="text-sm text-muted-foreground">
              {t("search.itemsCount", { count: filtered.length })}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 w-full mx-auto px-6 py-8">
          <div id={CATEGORY_LIST_ANCHOR} className="scroll-mt-24" aria-hidden />

          {selectedCategoryId != null ? (
            <div
              id={getCategorySectionId(selectedCategoryId)}
              className="scroll-mt-24 mb-6"
            >
              <h2 className="font-serif text-foreground text-2xl mb-2">
                {selectedCategoryLabel}
              </h2>
              {selectedCategoryDescription ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {selectedCategoryDescription}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-5 xl:gap-6">
            {filtered.map((p, i) => {
              const img = pickWholesaleImageUrl(
                p.imageUrls,
                [512, 1024, 1448],
              );
              const gradientClass =
                categoryStyleMap[p.category] ?? "from-gray-800 to-gray-600";
              const catIcon =
                p.categoryId != null
                  ? categoryIconMap[p.categoryId] ?? "📦"
                  : "📦";
              const desc = p.description ?? "";
              const badge: string | null = null;

              const specs: [string, string][] = [
                [t("productCard.unitLabel"), p.unit],
                [
                  t("productCard.priceLabel"),
                  canViewPrices && p.unitPrice
                    ? `$${Number(p.unitPrice).toFixed(2)}`
                    : t("productCard.priceValueLocked"),
                ],
                ...(p.minOrderQty
                  ? ([
                      [
                        t("productCard.minOrderLabel"),
                        t("productCard.minOrderValue", { qty: p.minOrderQty }),
                      ],
                    ] as [string, string][])
                  : []),
              ];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 4) * 0.07 }}
                  className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="relative h-44 overflow-hidden bg-muted">
                    {img ? (
                      <LazyImage
                        src={img}
                        alt={p.name}
                        wrapperClassName="size-full"
                        sizes={WHOLESALE_CARD_SIZES}
                        unmountWhenHidden
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}
                      >
                        <span className="text-5xl opacity-80">{catIcon}</span>
                      </div>
                    )}
                    {badge && (
                      <div className="absolute top-3 left-3 text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-primary text-white">
                        {badge}
                      </div>
                    )}
                    <div className="absolute top-3 right-3 text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-black/60 text-white backdrop-blur-sm">
                      {p.category}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground text-sm mb-2 leading-snug">
                      {p.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                      {desc}
                    </p>

                    {/* Specs table */}
                    <div className="rounded-lg border border-border/60 overflow-hidden mb-4">
                      {specs.map(([key, val]) => (
                        <div
                          key={key}
                          className="flex justify-between px-3 py-1.5 text-xs border-b border-border/40 last:border-0"
                        >
                          <span className="text-muted-foreground">{key}</span>
                          <span className="font-medium text-foreground">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {!canViewPrices ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("productCard.priceDisclaimer")}</span>
                        </div>
                        <div className="flex gap-2">
                          {/* <Link href="/member" className="flex-1">
                            <button className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                              {t("productCard.ctaPin")}
                            </button>
                          </Link> */}
                          <Link href="/member#register" className="flex-1">
                            <button className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                              {t("productCard.ctaRegister")}
                            </button>
                          </Link>
                        </div>
                      </>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">{t("noProducts.title", { search })}</p>
              <p className="text-sm mt-1">{t("noProducts.desc")}</p>
            </div>
          )}
        </div>
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="py-20" style={{ background: "oklch(13% 0.008 30)" }}>
        <div className="container">
          <div className="text-center mb-12">
            <div
              className="text-xs font-bold tracking-[0.2em] uppercase mb-3"
              style={{ color: "oklch(71% 0.155 62)" }}
            >
              {t("pricingHeading.tag")}
            </div>
            <h2 className="font-serif text-4xl lg:text-5xl font-bold text-white mb-4">
              {t("pricingHeading.title")}
            </h2>
            <p className="text-white/45 max-w-md mx-auto">
              {t("pricingHeading.desc")}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
            {/* Tailwind safelist: DB-stored tier colors must use from-/to- only (no via-). */}
            <div
              aria-hidden
              className="hidden from-white/5 to-white/10 from-amber-900/30 to-amber-800/20 from-slate-600/30 to-slate-500/20 from-yellow-700/30 to-yellow-600/20 from-primary/30 to-primary/20 from-amber-500/45 to-yellow-500/30 from-amber-500/40 to-yellow-600/25"
            />
            {pricingTiers.map((tier, i) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative bg-gradient-to-br ${tier.color} rounded-2xl p-6 border border-white/10 text-center min-w-[150px] ${tier.popular ? "ring-2 ring-primary/60" : ""}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-primary text-white whitespace-nowrap">
                    {t("pricingHeading.badgePopular")}
                  </div>
                )}
                <div className="text-xs font-bold tracking-[0.15em] uppercase text-white/50 mb-2">
                  {tier.label}
                </div>
                <div className="font-serif text-3xl font-bold text-white mb-1">
                  {formatTierDiscountValue(tier.discountValue)}
                </div>
                <div className="mt-2 text-white/55 text-sm font-medium">
                  {formatTierMinValue(tier.minValue)}
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-white/25 text-xs mt-8">
            {t("pricingHeading.disclaimer")}
          </p>
          <div className="text-center mt-8">
            <Link href="/member">
              <button className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                {t("pricingHeading.cta")} <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
