"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "@/components/link";
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { menuItemDetailPath, menuListPath, MENU_CATEGORIES_ANCHOR } from "@/lib/menu-item-routes";
import MenuItemImageZoom from "@/components/MenuItemImageZoom";
import FoodContentLabels from "@/components/FoodContentLabels";
import LazyImage from "@/components/LazyImage";
import { getRelatedMenuItems } from "@/lib/menu-related-items";
import { pickMenuImageUrl } from "@/types";
import PickLocationModal from "@/components/PickLocationModal";
import StoreLocationsDialog from "@/components/StoreLocationsDialog";
import { useCart, type MenuItem } from "@/contexts/CartContext";
import type { SiteCategory, StoreLocation } from "@/types";

const DEFAULT_IMG = "/manus-storage/banh-mi-1_9ba4dcf0.jpg";

type MenuItemViewProps = {
  item: MenuItem;
  menuItems: MenuItem[];
  categoriesContent: SiteCategory[];
  storeLocations: StoreLocation[];
};

export default function MenuItemView({
  item,
  menuItems,
  categoriesContent,
  storeLocations,
}: MenuItemViewProps) {
  const t = useTranslations("MenuItem");
  const tMenu = useTranslations("Menu");
  const locale = useLocale();

  const [qty, setQty] = useState(1);
  const [selectedGalleryId, setSelectedGalleryId] = useState("primary");
  const [pickLocationOpen, setPickLocationOpen] = useState(false);
  const [orderLocationsOpen, setOrderLocationsOpen] = useState(false);
  const extraPrice = 0;

  const { cartCount, cartTotal } = useCart();

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

  const menuItemPath = useCallback(
    (menuItem: MenuItem) => menuItemDetailPath(menuItem, locale),
    [locale],
  );

  const backHref = menuListPath(locale, item.category, MENU_CATEGORIES_ANCHOR);

  const relatedItems = useMemo(
    () => getRelatedMenuItems(item, menuItems),
    [item, menuItems],
  );

  type GalleryOption = {
    id: string;
    thumbSrc: string;
    displaySrc: string;
    zoomSrc: string;
  };

  const galleryOptions = useMemo((): GalleryOption[] => {
    const primaryThumb =
      pickMenuImageUrl(item.imageUrls, [256, 512, 1024]) ??
      item.imageUrl ??
      DEFAULT_IMG;
    const primaryDisplay =
      pickMenuImageUrl(item.imageUrls, [1024, 512, 1920]) ?? primaryThumb;
    const primaryZoom =
      pickMenuImageUrl(item.imageUrls, [1920, 1024]) ?? primaryDisplay;

    const options: GalleryOption[] = [
      {
        id: "primary",
        thumbSrc: primaryThumb,
        displaySrc: primaryDisplay,
        zoomSrc: primaryZoom,
      },
    ];

    (item.moreImages ?? []).forEach((entry, index) => {
      options.push({
        id: `more-${index}`,
        thumbSrc: entry.sm,
        displaySrc: entry.lg,
        zoomSrc: entry.lg,
      });
    });

    return options;
  }, [item.imageUrl, item.imageUrls, item.moreImages]);

  const hasMoreImages = (item.moreImages?.length ?? 0) > 0;

  const selectedGallery =
    galleryOptions.find((option) => option.id === selectedGalleryId) ??
    galleryOptions[0];

  const handleOrderNow = useCallback(() => {
    if (!item.isAvailable) return;
    setOrderLocationsOpen(true);
  }, [item.isAvailable]);

  /** @deprecated Previous add-to-cart / external POS handlers — kept for future refactors */
  const handleAddClick = useCallback(() => {
    // Previous: redirect to external POS
    // window.location.href = "https://saigonexpressrestaurant.com.au";

    // Previous: in-app customise + cart flow
    // if (!item.isAvailable) return;
    // const missing = getMissingRequiredOptionGroups(groups, selections);
    // if (missing.length > 0) { ... }
    // addToCart(item, buildCustomisation(qty), qty, false);
    // setCartOpen(true);

    handleOrderNow();
  }, [handleOrderNow]);

  const ingredients = item.ingredients;
  const nutrientRows = useMemo(
    () =>
      ingredients
        ? Object.entries(ingredients.nutritionalInformation).filter(
            ([, nutrient]) =>
              nutrient.label.trim() ||
              nutrient.perServing.trim() ||
              nutrient.perPortion.trim(),
          )
        : [],
    [ingredients],
  );

  type IngredientTextField = {
    key: string;
    labelKey:
      | "contentsLabel"
      | "foodHistoryLabel"
      | "allergensLabel"
      | "storageInstructionsLabel"
      | "preparationInstructionsLabel"
      | "cookingInstructionsLabel"
      | "servingInstructionsLabel";
    value: string;
  };

  const ingredientTextFields = useMemo((): IngredientTextField[] => {
    if (!ingredients) return [];
    const fields: IngredientTextField[] = [
      { key: "contents", labelKey: "contentsLabel", value: ingredients.contents },
      {
        key: "foodHistory",
        labelKey: "foodHistoryLabel",
        value: ingredients.foodHistory,
      },
      { key: "allergens", labelKey: "allergensLabel", value: ingredients.allergens },
      {
        key: "storageInstructions",
        labelKey: "storageInstructionsLabel",
        value: ingredients.storageInstructions,
      },
      {
        key: "preparationInstructions",
        labelKey: "preparationInstructionsLabel",
        value: ingredients.preparationInstructions,
      },
      {
        key: "cookingInstructions",
        labelKey: "cookingInstructionsLabel",
        value: ingredients.cookingInstructions,
      },
      {
        key: "servingInstructions",
        labelKey: "servingInstructionsLabel",
        value: ingredients.servingInstructions,
      },
    ];
    return fields.filter((field) => field.value.trim());
  }, [ingredients]);

  const nutritionTableSection = useMemo(() => {
    if (nutrientRows.length === 0 || !ingredients) return null;

    return (
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-brand-dark">
          {t("nutritionTitle")}
        </h3>
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full min-w-[20rem] text-sm">
            <thead>
              <tr className="border-b bg-brand-cream/80 text-left">
                <th className="px-3 py-2 font-semibold text-brand-dark">
                  {t("nutritionNutrientLabel")}
                </th>
                <th className="px-3 py-2 font-semibold text-brand-dark">
                  <span className="block">{t("nutritionPerServing")}</span>
                  {ingredients.servingSize.trim() ? (
                    <span className="mt-0.5 block text-xs font-normal text-brand-dark/70">
                      {ingredients.servingSize}
                    </span>
                  ) : null}
                </th>
                <th className="px-3 py-2 font-semibold text-brand-dark">
                  <span className="block">{t("nutritionPerPortion")}</span>
                  {ingredients.portionSize.trim() ? (
                    <span className="mt-0.5 block text-xs font-normal text-brand-dark/70">
                      {ingredients.portionSize}
                    </span>
                  ) : null}
                </th>
              </tr>
            </thead>
            <tbody>
              {nutrientRows.map(([key, nutrient]) => (
                <tr key={key} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-brand-dark">
                    {nutrient.label.trim() || key}
                  </td>
                  <td className="px-3 py-2 text-brand-dark/70">
                    {nutrient.perServing.trim() || "—"}
                  </td>
                  <td className="px-3 py-2 text-brand-dark/70">
                    {nutrient.perPortion.trim() || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [ingredients, nutrientRows, t]);

  return (
    <div className="min-h-screen bg-brand-cream pb-28 font-sans">      
      <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-6">
        <div className="mb-10 flex flex-col gap-10 lg:flex-row lg:gap-12">
          <div className="flex-[1.2]">
            <Link href={backHref} className="inline-block mb-4">
              <div className="flex items-center justify-between bg-brand-dark px-8 py-2 text-white transition-colors hover:bg-brand-dark/90 rounded">
                <ChevronLeft size={18} className="text-white/50 mr-2" />
                <div>
                  <p className="font-serif text-lg">{t("backToMenu")}</p>
                </div>            
              </div>
            </Link>

            {/* Media */}
            <div className="flex-[1.2]">
              <div>
                {selectedGallery ? (
                  <MenuItemImageZoom
                    src={selectedGallery.displaySrc}
                    zoomSrc={selectedGallery.zoomSrc}
                    alt={item.name}
                  />
                ) : null}
                <FoodContentLabels
                  foodContent={item.foodContent}
                  variant="accent"
                  className="mt-2 max-w-full"
                />
              </div>
            </div>

            {hasMoreImages ? (
              <div className="mt-4">
                <h2 className="mb-2 text-sm font-semibold text-brand-dark/70">
                  {t("additionalImagesTitle")}
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {galleryOptions.map((option, index) => {
                    const isActive = option.id === selectedGallery?.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedGalleryId(option.id)}
                        className={`h-[60px] w-20 shrink-0 overflow-hidden rounded border-2 bg-white transition-colors ${
                          isActive
                            ? "border-brand-red"
                            : "border-gray-200 hover:border-brand-red/40"
                        }`}
                        aria-label={t("additionalImagesSelect", {
                          index: index + 1,
                        })}
                        aria-pressed={isActive}
                      >
                        <img
                          src={option.thumbSrc}
                          alt=""
                          className="size-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {nutritionTableSection}
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

            {item.description ? (
              <p className="mb-6 text-sm leading-relaxed text-brand-dark/70">
                {item.description}
              </p>
            ) : null}

            {ingredientTextFields.length > 0 ? (
              <section className="mb-6 border-t border-gray-200 pt-5">
                <h2 className="mb-4 font-serif text-lg font-bold text-brand-dark">
                  {t("ingredientsTitle")}
                </h2>

                <div className="space-y-4">
                  {ingredientTextFields.map((field) => (
                    <div key={field.key}>
                      <h3 className="mb-1 text-sm font-semibold text-brand-dark">
                        {t(field.labelKey)}
                      </h3>
                      <p className="text-sm leading-relaxed text-brand-dark/70 whitespace-pre-line">
                        {field.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex items-center gap-4 border-t border-gray-200 pt-5">
              {/* TODO: currently using external order POS, will consider adding quantity selector back in the future */}
              {/* <div className="flex items-center overflow-hidden rounded border border-gray-200 bg-white">
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
              </div> */}
              <button
                type="button"
                onClick={handleOrderNow}
                disabled={!item.isAvailable}
                className={`flex h-10 flex-1 items-center justify-center gap-2 rounded px-4 text-sm font-semibold transition-colors ${
                  item.isAvailable
                    ? "bg-brand-amber text-white hover:bg-brand-amber/90"
                    : "cursor-not-allowed bg-gray-100 text-gray-400"
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart size={16} />
                  {/* {t("addToOrder")} */}
                  Order Now
                </span>
              </button>
            </div>
          </div>
        </div>

        {relatedItems.length > 0 ? (
          <section className="border-t border-gray-200 pt-8">
            <h2 className="mb-5 font-serif text-xl font-bold text-brand-dark">
              {t("relatedTitle")}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedItems.map((related) => (
                <Link
                  key={related.id}
                  href={menuItemPath(related)}
                  className="group overflow-hidden bg-white card-lift"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    {related.isPopular ? (
                      <div className="pointer-events-none absolute left-2 top-2 z-10">
                        <span className="bg-brand-red px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                          {tMenu("card.popularBadge")}
                        </span>
                      </div>
                    ) : null}
                    <LazyImage
                      src={
                        pickMenuImageUrl(related.imageUrls, [
                          512,
                          1024,
                          1920,
                          256,
                        ]) ??
                        related.imageUrl ??
                        categoryImageMap[related.category] ??
                        DEFAULT_IMG
                      }
                      alt={related.name}
                      wrapperClassName="size-full"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <FoodContentLabels
                    foodContent={related.foodContent}
                    variant="accent"
                    className="px-4 pt-2 max-w-full"
                  />
                  <div className="p-4 pt-2">
                    <h3 className="font-serif text-lg leading-snug text-brand-dark transition-colors group-hover:text-brand-red">
                      {related.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}        
      </div>

      <StoreLocationsDialog
        open={orderLocationsOpen}
        onClose={() => setOrderLocationsOpen(false)}
        stores={storeLocations}
      />

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

    </div>
  );
}
