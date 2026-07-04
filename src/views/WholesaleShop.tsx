"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import LazyImage from "@/components/LazyImage";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import { moveZeroSortOrderToEnd } from "@/lib/sort-order";
import {
  MEMBER_PORTAL_LIGHT_BANNER_CLASS,
  MEMBER_PORTAL_LIGHT_CARD_HOVER_CLASS,
  MEMBER_PORTAL_LIGHT_FILTER_INPUT_CLASS,
} from "@/lib/member-portal-surfaces";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useWholesaleInventory } from "@/contexts/WholesaleInventoryContext";
import { useSupabase, supabase } from "@/hooks/useSupabase";
import {
  applyWholesaleProductAvailability,
  type WholesaleProductAvailabilityRow,
} from "@/types";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LIST_ANCHOR,
  getCategorySectionId,
  scrollToCategoryInList,
} from "@/lib/category-list-scroll";
import { buildWholesaleProductsAvailabilityRpcArgs } from "@/lib/wholesale-availability-rpc";
import { resolvePortalType } from "@/lib/privileges";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import type { SiteCategory, UserProfile, WholesaleProduct } from "@/types";
import { pickWholesaleImageUrl } from "@/types";
import { Plus, Package, Building2, Search } from "lucide-react";
import { toast } from "sonner";
import CategorySelect from "@/components/CategorySelect";
import CategorySidebar, {
  CATEGORY_SIDEBAR_ASIDE_CLASS,
  CATEGORY_SIDEBAR_COLUMN_CLASS,
} from "@/components/CategorySidebar";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  filterCategoriesWithItems,
  getPopulatedCategoryIds,
} from "@/lib/category-bar";
import type { SiteCategoryGroup } from "@/types";

const ALL_CATEGORY = "All";
const WHOLESALE_CARD_SIZES =
  "(max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw";

type DashboardProduct = {
  id: number;
  name: string;
  categoryId: number | null;
  category: string;
  description: string;
  priceExGst: number;
  unit: string;
  badge: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  minOrderQty: number;
  sortOrder: number;
  effectiveRemaining: number;
  globalRemaining: number;
  customerRemaining: number | null;
  dailyCustomerLimit: number | null;
};

function mapProduct(p: WholesaleProduct): DashboardProduct {
  return {
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    category: p.category,
    description: p.description ?? "",
    priceExGst: Number(p.unitPrice ?? 0),
    unit: p.unit,
    badge: null,
    imageUrl: pickWholesaleImageUrl(p.imageUrls, [256, 512, 1024, 1448]),
    isAvailable: p.isAvailable,
    minOrderQty: p.minOrderQty ?? 1,
    sortOrder: p.sortOrder,
    effectiveRemaining: p.effectiveRemaining,
    globalRemaining: p.globalRemaining,
    customerRemaining: p.customerRemaining,
    dailyCustomerLimit: p.dailyCustomerLimit,
  };
}

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

export default function WholesaleShop({
  products,
  inventory,
  categoriesContent,
  categoryGroups,
}: {
  products: WholesaleProduct[];
  inventory: WholesaleProductAvailabilityRow[];
  categoriesContent: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
}) {
  const t = useTranslations("WholesaleShop");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, authMetadata, isLoading, signOut } = useSupabase();
  const { addToCart, getCartQty, clearCart } = useWholesaleCart();
  const { setInventory, validateQty, getMaxQty } = useWholesaleInventory();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [shopProducts, setShopProducts] = useState(products);

  const barCategories = useMemo(() => {
    const populatedCategoryIds = getPopulatedCategoryIds(shopProducts);
    return filterCategoriesWithItems(categoriesContent, populatedCategoryIds);
  }, [categoriesContent, shopProducts]);

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
      categoriesContent.reduce<Record<string, string>>((acc, category) => {
        if (category.icon) acc[category.name] = category.icon;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const categoryDescriptionMap = useMemo(
    () =>
      categoriesContent.reduce<Record<string, string>>((acc, category) => {
        const description = category.description?.trim();
        if (description) acc[category.name] = description;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const getCategoryIcon = useCallback(
    (categoryName: string) =>
      categoryName === ALL_CATEGORY ? null : categoryIconMap[categoryName] ?? null,
    [categoryIconMap],
  );

  const getCategoryIconFallback = useCallback(
    (categoryName: string): "all" | "category" =>
      categoryName === ALL_CATEGORY ? "all" : "category",
    [],
  );

  const me = useMemo(() => {
    if (!profile || !isWholesaleMemberConfirmed(profile, authMetadata)) {
      return null;
    }
    return {
      businessName: profile.business_name ?? "Your Business",
      contactName: getContactName(profile),
      portalType: resolvePortalType(authMetadata.privileges),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  const applyInventoryToProducts = (
    rows: WholesaleProductAvailabilityRow[],
    baseProducts: WholesaleProduct[],
  ) => {
    const availabilityByProductId = new Map(
      rows.map((row) => [row.product_id, row]),
    );
    return baseProducts.map((product) =>
      applyWholesaleProductAvailability(
        product,
        availabilityByProductId.get(product.id),
      ),
    );
  };

  useLayoutEffect(() => {
    setInventory(inventory);
    setShopProducts(applyInventoryToProducts(inventory, products));
  }, [inventory, products, setInventory]);

  useEffect(() => {
    if (!profile?.id) return;

    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase.rpc(
        "get_wholesale_products_availability",
        buildWholesaleProductsAvailabilityRpcArgs(profile.id),
      );

      if (cancelled || error || !data) return;

      const rows = data as WholesaleProductAvailabilityRow[];
      setInventory(rows);
      setShopProducts(applyInventoryToProducts(rows, products));
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, products, setInventory]);

  useEffect(() => {
    if (!isLoading && !me) {
      router.push("/member");
    }
  }, [me, isLoading, router]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      clearCart();
      toast.success("Payment successful! Your wholesale order has been placed.");
    } else if (checkout === "cancelled") {
      toast.error("Checkout was cancelled. Your cart is unchanged.");
    } else if (checkout === "failed") {
      toast.error("Payment failed. Please try again.");
    }

    router.replace(pathname, { scroll: false });
  }, [searchParams, router, pathname, clearCart]);

  const allProducts = useMemo(() => shopProducts.map(mapProduct), [shopProducts]);

  const selectedCategoryId = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) return null;
    return (
      categoriesContent.find((category) => category.name === selectedCategory)
        ?.id ?? null
    );
  }, [selectedCategory, categoriesContent]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return moveZeroSortOrderToEnd(
      allProducts.filter((p) => {
        const matchesCategory =
          selectedCategoryId === null || p.categoryId === selectedCategoryId;
        const matchesSearch =
          !normalizedSearch ||
          p.name.toLowerCase().includes(normalizedSearch) ||
          p.description.toLowerCase().includes(normalizedSearch);
        return matchesCategory && matchesSearch;
      }),
      (item) => item.sortOrder,
    );
  }, [allProducts, search, selectedCategoryId]);

  const handleCategoryClick = useCallback((cat: string) => {
    setSelectedCategory(cat);
    scrollToCategoryInList(cat, ALL_CATEGORY);
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

  const handleAddToCart = (product: DashboardProduct) => {
    const cartQty = getCartQty(product.id);
    const nextQty = cartQty + 1;
    const validation = validateQty(product.id, nextQty, product.name);

    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    addToCart({
      productId: product.id,
      productName: product.name,
      unitPrice: product.priceExGst,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <MemberPortalBackground variant="light">
      <MemberHeader
        member={me}
        onLogout={() => void handleLogout()}
        theme="light"
      />

      {/* Welcome banner */}
      <div className={`py-6 ${MEMBER_PORTAL_LIGHT_BANNER_CLASS}`}>
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            {me ? (
              <div>
                <h1 className="font-serif text-2xl font-bold text-gray-900">
                  Welcome, {me.contactName}
                </h1>
                <p className="text-gray-500 text-sm">
                  {me.businessName}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="scroll-mt-20" aria-hidden />

      <div className="sticky top-16 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="max-w-[1280px] mx-auto px-6 py-3">
          <CategorySelect
            allLabel={ALL_CATEGORY}
            activeCategory={selectedCategory}
            onCategorySelect={handleCategoryClick}
            categories={barCategories}
            categoryGroups={categoryGroups}
            label={t("categories.label")}
            placeholder={t("categories.placeholder")}
            searchPlaceholder={t("categories.searchPlaceholder")}
            emptyMessage={t("categories.empty")}
            getCategoryIcon={getCategoryIcon}
            getCategoryIconFallback={getCategoryIconFallback}
            variant="member"
          />
        </div>
      </div>

      <div className="lg:flex lg:items-start">
        <div className={CATEGORY_SIDEBAR_COLUMN_CLASS}>
          <aside
            aria-label={t("categories.label")}
            className={cn(
              CATEGORY_SIDEBAR_ASIDE_CLASS,
              "border-r border-gray-100 bg-white px-4 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)]",
            )}
          >
            <CategorySidebar
              allLabel={ALL_CATEGORY}
              activeCategory={selectedCategory}
              onCategorySelect={handleCategoryClick}
              categories={barCategories}
              categoryGroups={categoryGroups}
              variant="member"
              renderCategoryLeading={(category) => (
                <CategoryIcon
                  icon={getCategoryIcon(category.name)}
                  fallback={getCategoryIconFallback(category.name)}
                  className="size-5 shrink-0 text-base"
                  fallbackClassName="size-3.5"
                />
              )}
            />
          </aside>
        </div>

      <div className="min-w-0 w-full flex-1 pt-3 pb-8 px-6 py-10">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${MEMBER_PORTAL_LIGHT_FILTER_INPUT_CLASS} pl-11 pr-4 py-3`}
            />
          </div>
        </div>

        <div id={CATEGORY_LIST_ANCHOR} className="scroll-mt-24" aria-hidden />

        {selectedCategory !== ALL_CATEGORY ? (
          <div
            id={getCategorySectionId(selectedCategory)}
            className="scroll-mt-24 mb-6"
          >
            <h2 className="font-serif text-2xl font-bold text-gray-900 mb-2">
              {selectedCategory}
            </h2>
            {categoryDescriptionMap[selectedCategory] ? (
              <p className="text-sm leading-relaxed text-gray-500">
                {categoryDescriptionMap[selectedCategory]}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-5 xl:gap-6">
          {filtered.map((product) => {
            const gradientClass =
              categoryStyleMap[product.category] ?? "from-gray-800 to-gray-600";
            const icon = categoryIconMap[product.category];
            const cartQty = getCartQty(product.id);
            const maxQty = getMaxQty(product.id);
            const outOfStock =
              !product.isAvailable || product.effectiveRemaining <= 0;
            const atCartMax =
              Number.isFinite(maxQty) && cartQty >= maxQty;
            const customerLimitIsTighter =
              product.dailyCustomerLimit != null &&
              product.customerRemaining != null &&
              product.customerRemaining < product.globalRemaining;

            return (
              <div
                key={product.id}
                className={`group [contain-intrinsic-size:420px] [content-visibility:auto] ${MEMBER_PORTAL_LIGHT_CARD_HOVER_CLASS} ${outOfStock ? "opacity-60" : ""}`}
              >
                <div className="relative h-44 overflow-hidden">
                  {product.imageUrl ? (
                    <LazyImage
                      src={product.imageUrl}
                      alt={product.name}
                      wrapperClassName="size-full"
                      sizes={WHOLESALE_CARD_SIZES}
                      unmountWhenHidden
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}
                    >
                      {icon ? (
                        <span className="text-5xl opacity-80">{icon}</span>
                      ) : (
                        <Package className="w-12 h-12 opacity-80 text-white" />
                      )}
                    </div>
                  )}
                  {product.badge ? (
                    <div className="absolute top-3 left-3 text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-primary text-white">
                      {product.badge}
                    </div>
                  ) : null}
                  {outOfStock ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        Out of Stock
                      </span>
                    </div>
                  ) : null}
                  <div className="absolute top-3 right-3 text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-black/60 text-white backdrop-blur-sm">
                    {product.category}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1.5 leading-snug">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        ${Number(product.priceExGst).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">
                        per {product.unit} ex GST
                      </div>
                      {product.effectiveRemaining > 0 ? (
                        <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                          {product.effectiveRemaining} left today
                          {customerLimitIsTighter ? (
                            <span className="text-amber-700">
                              {" - your limit: "}
                              {product.customerRemaining}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {cartQty > 0 ? (
                      <div className="text-xs font-semibold text-primary bg-primary/15 px-2 py-1 rounded-lg">
                        {cartQty} in cart
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={outOfStock || atCartMax}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" />
                    {outOfStock
                      ? "Out of Stock"
                      : atCartMax
                        ? "Limit reached"
                        : "Add to Cart"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No products found</p>
          </div>
        ) : null}
        </div>
      </div>
    </MemberPortalBackground>
  );
}
