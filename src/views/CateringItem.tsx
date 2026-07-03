"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "@/components/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import CateringPackOrderButton from "@/components/CateringPackOrderButton";
import CateringProductHtml from "@/components/CateringProductHtml";
import CateringTierSelect from "@/components/CateringTierSelect";
import {
  EMPTY_CUSTOMISE_MENU_ITEM,
  ItemCustomiseInlineAddSection,
  ItemCustomiseInlineFields,
  useCateringItemCustomisation,
} from "@/components/ItemCustomiseInline";
import type { ItemCustomisation } from "@/lib/product-customizations";
import LazyImage from "@/components/LazyImage";
import ItemFoodSafetyNotice from "@/components/ItemFoodSafetyNotice";
import MenuItemImageZoom from "@/components/MenuItemImageZoom";
import { useCateringCart } from "@/contexts/CateringCartContext";
import { useGuestCateringOrder } from "@/contexts/GuestCateringOrderContext";
import { cateringPackToCustomiseItem } from "@/lib/catering-customise-item";
import {
  CATERING_CATEGORIES_ANCHOR,
  cateringItemDetailPath,
  cateringListPath,
} from "@/lib/catering-item-routes";
import { getRelatedCateringItems } from "@/lib/catering-related-items";
import { parseCateringPrice, formatAud, formatCateringDisplayPrice } from "@/lib/catering-price";
import { shouldBlockGuestCateringCart } from "@/lib/guest-catering-order-session";
import {
  FEATURED_CATERING_PACK_CATEGORY,
  type CateringPack,
  type CateringTierPrice,
} from "@/lib/supabase/catering-packs";
import { useSupabase } from "@/hooks/useSupabase";
import { pickMenuImageUrl } from "@/types";

const DEFAULT_IMG = "/placeholder.svg";

type CateringItemViewProps = {
  item: CateringPack;
  packs: CateringPack[];
};

export default function CateringItemView({ item, packs }: CateringItemViewProps) {
  const t = useTranslations("CateringItem");
  const tCatering = useTranslations("Catering");
  const locale = useLocale();

  const { isSignedIn } = useSupabase();
  const { addToCart, cartCount, cartTotal, setCartOpen } = useCateringCart();
  const { session, trackedOrder, setLastOrderOpen, isHydrated } =
    useGuestCateringOrder();

  const guestOrderBlocksCart =
    isHydrated &&
    shouldBlockGuestCateringCart(session, trackedOrder, isSignedIn);

  const [selectedGalleryId, setSelectedGalleryId] = useState("primary");
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [resolveOrderWarning, setResolveOrderWarning] = useState(false);

  const selectedTier: CateringTierPrice | null =
    item.prices[selectedTierIndex] ?? null;

  const displayPrice = useMemo(() => {
    const raw =
      selectedTier?.price ?? item.price ?? item.prices[0]?.price ?? null;
    return formatCateringDisplayPrice(raw);
  }, [item.price, item.prices, selectedTier?.price]);

  const unitPrice = useMemo(() => {
    if (selectedTier != null) {
      return parseCateringPrice(selectedTier.price);
    }
    return parseCateringPrice(item.price);
  }, [item.price, selectedTier]);

  const customiseMenuItem = useMemo(() => {
    if (unitPrice == null) return null;
    return cateringPackToCustomiseItem(item, unitPrice);
  }, [item, unitPrice]);

  const customisationState = useCateringItemCustomisation(
    customiseMenuItem ?? EMPTY_CUSTOMISE_MENU_ITEM,
  );

  const hasCustomizations = customisationState.groups.length > 0;

  const orderPriceLabel = useMemo(() => {
    if (unitPrice == null) return null;
    return (
      formatCateringDisplayPrice(selectedTier?.price) ||
      formatCateringDisplayPrice(item.price) ||
      formatAud(unitPrice)
    );
  }, [item.price, selectedTier?.price, unitPrice]);

  const hasOrderPrice = useMemo(() => {
    if (item.prices.length > 0) {
      const tierPrice = selectedTier?.price ?? item.prices[0]?.price;
      return parseCateringPrice(tierPrice) != null;
    }
    return parseCateringPrice(item.price) != null;
  }, [item.price, item.prices, selectedTier?.price]);

  const handleBlockedAddToOrder = useCallback(() => {
    const message = tCatering("guestOrder.resolveFirst");
    toast.warning(message, {
      id: "catering-resolve-order",
      duration: 7000,
    });
    setResolveOrderWarning(true);
    setLastOrderOpen(true);
    requestAnimationFrame(() => {
      document
        .getElementById("catering-resolve-order-warning")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [setLastOrderOpen, tCatering]);

  const addLineToCart = useCallback(
    (customisation?: ItemCustomisation) => {
      if (!item.isAvailable || unitPrice == null) return;

      if (guestOrderBlocksCart) {
        handleBlockedAddToOrder();
        return;
      }

      addToCart(
        {
          productId: item.id,
          productName: item.name,
          variantLabel: selectedTier?.size ?? null,
          unitPrice,
          catalogUnitPrice: item.catalogUnitPrice,
          imageUrl: item.img,
        },
        customisation ? { customisation } : undefined,
      );
    },
    [
      addToCart,
      guestOrderBlocksCart,
      handleBlockedAddToOrder,
      item,
      selectedTier,
      unitPrice,
    ],
  );

  const handleAddToOrder = useCallback(() => {
    if (hasCustomizations) return;
    addLineToCart();
  }, [addLineToCart, hasCustomizations]);

  const handleAddWithCustomisation = useCallback(
    (customisation: ItemCustomisation) => {
      addLineToCart(customisation);
    },
    [addLineToCart],
  );

  const itemPath = useCallback(
    (pack: CateringPack) => cateringItemDetailPath(pack, locale),
    [locale],
  );

  const relatedItems = useMemo(
    () => getRelatedCateringItems(item, packs),
    [item, packs],
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
      item.img ??
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
  }, [item.imageUrls, item.img, item.moreImages]);

  const hasMoreImages = (item.moreImages?.length ?? 0) > 0;

  const selectedGallery =
    galleryOptions.find((option) => option.id === selectedGalleryId) ??
    galleryOptions[0];

  useEffect(() => {
    if (!guestOrderBlocksCart) {
      setResolveOrderWarning(false);
    }
  }, [guestOrderBlocksCart]);

  const backHref =
    item.category === FEATURED_CATERING_PACK_CATEGORY
      ? cateringListPath(locale, null, CATERING_CATEGORIES_ANCHOR)
      : cateringListPath(
          locale,
          item.categoryAlias ?? item.category,
          CATERING_CATEGORIES_ANCHOR,
        );

  return (
    <div className="min-h-screen bg-brand-cream pb-28 font-sans">
      <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-6">
        {guestOrderBlocksCart && resolveOrderWarning ? (
          <div
            id="catering-resolve-order-warning"
            role="alert"
            className="mb-8 rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
          >
            {tCatering("guestOrder.resolveFirst")}
          </div>
        ) : null}

        <div className="mb-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          <div className="flex-[1.2] lg:sticky lg:top-20 lg:self-start">
            <Link href={backHref} className="mb-4 inline-block">
              <div className="flex items-center justify-between rounded bg-brand-dark px-8 py-2 text-white transition-colors hover:bg-brand-dark/90">
                <ChevronLeft size={18} className="mr-2 text-white/50" />
                <div>
                  <p className="font-serif text-lg">{t("backToCatering")}</p>
                  <p className="text-xs text-white/60">{t("backToCateringHint")}</p>
                </div>
              </div>
            </Link>

            <div>
              {selectedGallery ? (
                <MenuItemImageZoom
                  src={selectedGallery.displaySrc}
                  zoomSrc={selectedGallery.zoomSrc}
                  alt={item.name}
                />
              ) : null}
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
          </div>

          <div className="flex-1">
            <h1 className="mb-2 font-serif text-3xl font-bold leading-tight text-brand-dark">
              {item.name}
            </h1>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded bg-brand-red/10 px-2 py-0.5 text-[11px] font-semibold text-brand-red">
                {item.category}
              </span>
              {item.tag ? (
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold text-white ${item.tagBg || "bg-brand-red"}`}
                >
                  {item.tag}
                </span>
              ) : null}
              {!item.isAvailable ? (
                <span className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
                  <AlertCircle size={12} className="text-brand-red" />
                  {t("unavailableBadge")}
                </span>
              ) : null}
            </div>

            {displayPrice ? (
              <p className="mb-3 text-2xl font-bold text-brand-red">
                {displayPrice}
              </p>
            ) : null}

            {item.serves ? (
              <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-brand-dark/70">
                <Users size={14} className="text-brand-red" />
                {tCatering("menu.caters", { serves: item.serves })}
              </p>
            ) : null}

            {item.description ? (
              <p className="mb-6 text-sm leading-relaxed text-brand-dark/70">
                {item.description}
              </p>
            ) : null}

            {item.note ? (
              <CateringProductHtml
                html={item.note}
                className="mb-4 text-sm italic text-brand-dark/55"
              />
            ) : null}

            {item.includes.length > 0 ? (
              <section className="mb-6 border-t border-gray-200 pt-5">
                <h2 className="mb-3 font-serif text-lg font-bold text-brand-dark">
                  {t("includesTitle")}
                </h2>
                <ul className="space-y-2">
                  {item.includes.map((inc, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-brand-dark/70"
                    >
                      <CheckCircle
                        size={14}
                        className="mt-0.5 shrink-0 text-brand-red"
                      />
                      {inc}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="flex flex-col gap-4 border-t border-gray-200 pt-5">
              {item.prices.length > 0 ? (
                <CateringTierSelect
                  id={`catering-tier-detail-${item.id}`}
                  tiers={item.prices}
                  value={selectedTierIndex}
                  onValueChange={setSelectedTierIndex}
                  label={tCatering("menu.sizeLabel")}
                  variant="light"
                />
              ) : null}

              {hasCustomizations ? (
                <ItemCustomiseInlineFields
                  groups={customisationState.groups}
                  selections={customisationState.selections}
                  note={customisationState.note}
                  onNoteChange={customisationState.setNote}
                  onToggleOption={customisationState.toggleOption}
                  className="mb-0 border-t-0 pt-0"
                />
              ) : null}

              {hasOrderPrice ? (
                hasCustomizations && unitPrice != null && orderPriceLabel ? (
                  <ItemCustomiseInlineAddSection
                    unitPrice={unitPrice}
                    priceLabel={orderPriceLabel}
                    orderLabel={tCatering("menu.addToOrder")}
                    groups={customisationState.groups}
                    selections={customisationState.selections}
                    buildCustomisation={customisationState.buildCustomisation}
                    onAdd={handleAddWithCustomisation}
                    disabled={!item.isAvailable}
                  />
                ) : (
                  <CateringPackOrderButton
                    pack={item}
                    selectedTier={selectedTier}
                    onAdd={handleAddToOrder}
                    orderLabel={tCatering("menu.addToOrder")}
                    quoteLabel={tCatering("menu.customPrice")}
                    disabled={!item.isAvailable}
                  />
                )
              ) : (
                <Link
                  href={`${cateringListPath(locale)}#catering-enquiry-form`}
                  className="flex h-11 w-full items-center justify-center gap-2 bg-brand-red px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-red/90"
                >
                  {tCatering("menu.enquire")}
                  <ChevronRight size={14} />
                </Link>
              )}

              {!hasOrderPrice ? (
                <p className="text-xs text-brand-dark/45">
                  {tCatering("menu.customPrice")}
                </p>
              ) : null}

              <ItemFoodSafetyNotice />
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
                  href={itemPath(related)}
                  className="group card-lift overflow-hidden bg-white"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <LazyImage
                      src={
                        pickMenuImageUrl(related.imageUrls, [
                          512,
                          1024,
                          1920,
                          256,
                        ]) ??
                        related.img ??
                        DEFAULT_IMG
                      }
                      alt={related.name}
                      wrapperClassName="size-full"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif text-lg leading-snug text-brand-dark transition-colors group-hover:text-brand-red">
                      {related.name}
                    </h3>
                    {related.price ? (
                      <p className="mt-1 text-sm font-semibold text-brand-red">
                        {related.price}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {cartCount > 0 ? (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 p-3 pb-5">
          <div className="pointer-events-auto mx-auto max-w-2xl">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
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
                  {t("cartBar.heading")}
                </div>
                <div className="mt-0.5 text-sm text-white/80">
                  {t("cartBar.summary", {
                    count: cartCount,
                    total: formatAud(cartTotal),
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
