"use client";

import Link from "@/components/link";
import CateringPackOrderButton from "@/components/CateringPackOrderButton";
import CateringProductHtml from "@/components/CateringProductHtml";
import LazyImage from "@/components/LazyImage";
import CateringTierSelect from "@/components/CateringTierSelect";
import {
  ItemCustomiseModal,
  type ItemCustomisation,
} from "@/components/ItemCustomiseModal";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import { toast } from "sonner";
import {
  CheckCircle,
  Users,
  Clock,
  Star,
  ChevronRight,
  MapPin,
  Phone,
} from "lucide-react";
import {
  FEATURED_CATERING_PACK_CATEGORY,
  type CateringPack,
  type CateringTierPrice,
} from "@/lib/supabase/catering-packs";
import { cn } from "@/lib/utils";
import { useCateringCart } from "@/contexts/CateringCartContext";
import { useProductCustomizations } from "@/contexts/ProductCustomizationsContext";
import { useGuestCateringOrder } from "@/contexts/GuestCateringOrderContext";
import { cateringPackToCustomiseItem } from "@/lib/catering-customise-item";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { useFormattedContactPhone } from "@/hooks/useFormattedContactPhone";
import { shouldBlockGuestCateringCart } from "@/lib/guest-catering-order-session";
import { useSupabase } from "@/hooks/useSupabase";
import {
  formatCateringPackCardPriceLabel,
  parseCateringPrice,
} from "@/lib/catering-price";
import {
  CATERING_CATEGORIES_ANCHOR,
  cateringItemDetailPath,
} from "@/lib/catering-item-routes";
import {
  buildCateringCategoryQueryFromId,
  resolveCateringCategoryFromUrlParam,
} from "@/lib/catering-category-url";
import {
  CATEGORY_LIST_ANCHOR,
  getCategorySectionId,
  scrollToCategoryInList,
} from "@/lib/category-list-scroll";
import {
  categoryDisplaySortRank,
  sortCategoriesByDisplayOrder,
} from "@/lib/category-sort";
import CategorySelect from "@/components/CategorySelect";
import CategorySidebar, {
  CategorySidebarAside,
  CATEGORY_SIDEBAR_COLUMN_CLASS,
} from "@/components/CategorySidebar";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  filterCategoriesWithItems,
  getPopulatedCategoryIds,
  sortGroupsByCategoryBarOrder,
} from "@/lib/category-bar";
import Fuse from "fuse.js";
import type { SiteCategory, SiteCategoryGroup } from "@/types";
import Image from "next/image";

type CateringMenuGroup = {
  categoryId: number | null;
  category: string;
  items: CateringPack[];
  sortOrder: number;
};

function buildCateringMenuGroups(
  packs: CateringPack[],
  categoriesContent: SiteCategory[],
): CateringMenuGroup[] {
  const categoryMeta = new Map(
    categoriesContent.map((category) => [
      category.id,
      { sortOrder: category.sortOrder, name: category.name },
    ]),
  );

  const groups = packs
    .filter(
      (pack) =>
        pack.isAvailable && pack.category !== FEATURED_CATERING_PACK_CATEGORY,
    )
    .reduce<Map<number, CateringMenuGroup>>((groupMap, item) => {
      const categoryIds =
        item.categoryIds.length > 0
          ? item.categoryIds
          : item.categoryId != null
            ? [item.categoryId]
            : [];

      for (const categoryId of categoryIds) {
        const meta = categoryMeta.get(categoryId);
        const existing = groupMap.get(categoryId);
        if (existing) {
          if (!existing.items.some((pack) => pack.id === item.id)) {
            existing.items.push(item);
          }
          existing.sortOrder = Math.min(existing.sortOrder, item.sortOrder);
          continue;
        }

        groupMap.set(categoryId, {
          categoryId,
          category: meta?.name ?? item.category,
          items: [item],
          sortOrder: meta?.sortOrder ?? item.sortOrder,
        });
      }

      return groupMap;
    }, new Map());

  return [...groups.values()]
    .filter((group) => group.items.length > 0)
    .sort((a, b) => {
      const aMeta =
        a.categoryId != null ? categoryMeta.get(a.categoryId) : undefined;
      const bMeta =
        b.categoryId != null ? categoryMeta.get(b.categoryId) : undefined;
      const aRank = aMeta
        ? categoryDisplaySortRank(aMeta.sortOrder)
        : Number.MAX_SAFE_INTEGER;
      const bRank = bMeta
        ? categoryDisplaySortRank(bMeta.sortOrder)
        : Number.MAX_SAFE_INTEGER;

      return (
        aRank - bRank ||
        (aMeta?.name ?? a.category).localeCompare(bMeta?.name ?? b.category) ||
        a.sortOrder - b.sortOrder ||
        a.category.localeCompare(b.category)
      );
    });
}

type CateringProps = {
  packs: CateringPack[];
  categoriesContent: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
};

interface WhyUsItem {
  emoji: string;
  title: string;
  desc: string;
}

interface StatItem {
  num: string;
  label: string;
}

function PackOrderButton({
  pack,
  selectedTier,
  onAdd,
  orderLabel,
  quoteLabel,
}: {
  pack: CateringPack;
  selectedTier: CateringTierPrice | null;
  onAdd: () => void;
  orderLabel: string;
  quoteLabel: string;
}) {
  return (
    <CateringPackOrderButton
      pack={pack}
      selectedTier={selectedTier}
      onAdd={onAdd}
      orderLabel={orderLabel}
      quoteLabel={quoteLabel}
    />
  );
}

const CATERING_ENQUIRY_SUBMIT_COOLDOWN_MS = 2 * 60 * 1000;
const CATERING_ENQUIRY_LAST_SUBMIT_KEY = "catering_enquiry_last_submit_at";
const SHOW_CATERING_PACKS_SECTION = false;
const CATERING_PACK_CARD_SIZES = "(max-width: 768px) 100vw, 50vw";
const CATERING_MENU_CARD_SIZES =
  "(max-width: 1024px) 50vw, (max-width: 1280px) 50vw, (max-width: 1536px) 33vw, 25vw";

export default function Catering({
  packs,
  categoriesContent,
  categoryGroups,
}: CateringProps) {
  const t = useTranslations("Catering");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const allLabel = t("menu.allCategory");
  const urlCategory = searchParams.get("category");
  const contactPhone = useFormattedContactPhone();
  const contactEmail = useSiteSetting("contact_us_email")?.trim();
  const { isSignedIn } = useSupabase();
  const { addToCart } = useCateringCart();
  const { getOptionGroupsForItem } = useProductCustomizations();
  const { session, trackedOrder, setLastOrderOpen, isHydrated } =
    useGuestCateringOrder();
  const guestOrderBlocksCart =
    isHydrated &&
    shouldBlockGuestCateringCart(session, trackedOrder, isSignedIn);
  const [resolveOrderWarning, setResolveOrderWarning] = useState(false);
  const [tierSelection, setTierSelection] = useState<Record<number, number>>({});
  const [customiseTarget, setCustomiseTarget] = useState<{
    pack: CateringPack;
    tier: CateringTierPrice | null;
    unitPrice: number;
  } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [form, setForm] = useState({
    contactName: "",
    email: "",
    phone: "",
    businessName: "",
    eventDate: "",
    guestCount: "",
    message: "",
  });
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(() => {
    const resolved = resolveCateringCategoryFromUrlParam(
      urlCategory,
      categoriesContent,
    );
    return resolved?.id ?? null;
  });

  const availablePacks = useMemo(
    () => packs.filter((pack) => pack.isAvailable),
    [packs],
  );

  const featuredPacks = useMemo(
    () =>
      availablePacks.filter(
        (pack) => pack.category === FEATURED_CATERING_PACK_CATEGORY,
      ),
    [availablePacks],
  );

  const sortedCategories = useMemo(
    () => sortCategoriesByDisplayOrder(categoriesContent),
    [categoriesContent],
  );

  const barCategories = useMemo(() => {
    const populatedCategoryIds = getPopulatedCategoryIds(availablePacks);
    return filterCategoriesWithItems(categoriesContent, populatedCategoryIds);
  }, [availablePacks, categoriesContent]);

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

  const searchablePacks = useMemo(
    () =>
      availablePacks.filter(
        (pack) => pack.category !== FEATURED_CATERING_PACK_CATEGORY,
      ),
    [availablePacks],
  );

  const fuse = useMemo(
    () =>
      new Fuse(searchablePacks, {
        keys: [
          { name: "name", weight: 0.6 },
          { name: "description", weight: 0.3 },
          { name: "category", weight: 0.1 },
        ],
        threshold: 0.35,
      }),
    [searchablePacks],
  );

  const menuGroups = useMemo(
    () => buildCateringMenuGroups(availablePacks, sortedCategories),
    [availablePacks, sortedCategories],
  );

  const visibleMenuGroups = useMemo(() => {
    const categoryFiltered =
      activeCategoryId == null
        ? menuGroups
        : menuGroups.filter((group) => group.categoryId === activeCategoryId);

    const orderedGroups = sortGroupsByCategoryBarOrder(
      categoryFiltered,
      barCategories,
      categoryGroups,
    );

    const query = search.trim();
    if (!query) return orderedGroups;

    const matchingIds = new Set(
      fuse.search(query).map((result) => result.item.id),
    );

    return orderedGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => matchingIds.has(item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [
    activeCategoryId,
    menuGroups,
    barCategories,
    categoryGroups,
    search,
    fuse,
  ]);

  const replaceCategoryInUrl = useCallback(
    (categoryId: number | null) => {
      const query = buildCateringCategoryQueryFromId(
        categoryId,
        categoriesContent,
      );
      const nextUrl = query ? `${pathname}?${query}` : pathname;
      window.history.replaceState(window.history.state, "", nextUrl);
    },
    [pathname, categoriesContent],
  );

  const handleCategoryClick = useCallback(
    (categoryId: number | null) => {
      setActiveCategoryId(categoryId);
      replaceCategoryInUrl(categoryId);
      scrollToCategoryInList(categoryId);
    },
    [replaceCategoryInUrl],
  );

  // Load configuration arrays from translation files
  const whyUsList: WhyUsItem[] = t.raw("whyUs.items");
  const statsList: StatItem[] = t.raw("stats");

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const param = params.get("category");
      if (!param) {
        setActiveCategoryId(null);
        return;
      }

      const resolved = resolveCateringCategoryFromUrlParam(
        param,
        categoriesContent,
      );
      if (!resolved) {
        setActiveCategoryId(null);
        return;
      }

      setActiveCategoryId(resolved.id);

      if (param !== resolved.alias) {
        params.set("category", resolved.alias);
        const query = params.toString();
        const hash = window.location.hash;
        window.history.replaceState(
          window.history.state,
          "",
          query ? `${pathname}?${query}${hash}` : `${pathname}${hash}`,
        );
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [urlCategory, categoriesContent, allLabel, pathname]);

  useEffect(() => {
    const scrollToCategories = () => {
      if (window.location.hash !== `#${CATERING_CATEGORIES_ANCHOR}`) return;
      requestAnimationFrame(() => {
        document.getElementById(CATERING_CATEGORIES_ANCHOR)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };

    scrollToCategories();
    window.addEventListener("hashchange", scrollToCategories);
    return () => window.removeEventListener("hashchange", scrollToCategories);
  }, [urlCategory, menuGroups.length]);

  useEffect(() => {
    if (!guestOrderBlocksCart) {
      setResolveOrderWarning(false);
    }
  }, [guestOrderBlocksCart]);

  useEffect(() => {
    const updateCooldown = () => {
      const lastSubmitAt = Number(
        window.localStorage.getItem(CATERING_ENQUIRY_LAST_SUBMIT_KEY) ?? "0",
      );
      const remainingMs =
        lastSubmitAt + CATERING_ENQUIRY_SUBMIT_COOLDOWN_MS - Date.now();
      setCooldownSeconds(
        remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0,
      );
    };

    updateCooldown();
    const timerId = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const cooldownLabel = `${Math.floor(cooldownSeconds / 60)}:${String(
    cooldownSeconds % 60,
  ).padStart(2, "0")}`;

  const handleBlockedAddToOrder = () => {
    const message = t("guestOrder.resolveFirst");
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
  };

  const handleEnquireItem = (itemName: string, price: string) => {
    setForm((prev) => ({
      ...prev,
      message: prev.message
        ? prev.message
        : t("form.enquireTemplate", { boxName: itemName, price }),
    }));
    const el = document.getElementById("catering-enquiry-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const customiseItem = useMemo(
    () =>
      customiseTarget
        ? cateringPackToCustomiseItem(
            customiseTarget.pack,
            customiseTarget.unitPrice,
          )
        : null,
    [customiseTarget],
  );

  const handleAddPack = (
    pack: CateringPack,
    tier: CateringTierPrice | null,
  ) => {
    if (guestOrderBlocksCart) {
      handleBlockedAddToOrder();
      return;
    }

    const unitPrice =
      tier != null
        ? parseCateringPrice(tier.price)
        : parseCateringPrice(pack.price);

    if (unitPrice == null) {
      toast.error("This item requires a custom quote. Please contact catering.");
      return;
    }

    const customiseMenuItem = cateringPackToCustomiseItem(pack, unitPrice);
    if (getOptionGroupsForItem(customiseMenuItem).length > 0) {
      setCustomiseTarget({ pack, tier, unitPrice });
      return;
    }

    addToCart({
      productId: pack.id,
      productName: pack.name,
      variantLabel: tier?.size ?? null,
      unitPrice,
      catalogUnitPrice: pack.catalogUnitPrice,
      imageUrl: pack.img,
    });
  };

  const handleCustomiseConfirm = useCallback(
    (customisation: ItemCustomisation) => {
      if (!customiseTarget) return;

      const { pack, tier, unitPrice } = customiseTarget;
      addToCart(
        {
          productId: pack.id,
          productName: pack.name,
          variantLabel: tier?.size ?? null,
          unitPrice,
          catalogUnitPrice: pack.catalogUnitPrice,
          imageUrl: pack.img,
        },
        { customisation },
      );
      setCustomiseTarget(null);
    },
    [addToCart, customiseTarget],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactName || !form.email) {
      toast.error(t("errors.requiredFields"));
      return;
    }

    if (cooldownSeconds > 0) {
      toast.error(t("errors.rateLimit", { time: cooldownLabel }));
      return;
    }

    const parsedGuestCount = form.guestCount.trim()
      ? Number.parseInt(form.guestCount, 10)
      : null;
    const guestCount =
      parsedGuestCount != null && Number.isFinite(parsedGuestCount)
        ? parsedGuestCount
        : null;

    setIsSubmitting(true);
    try {
      const result = await invokeEdgeFunction<{ id: number; submitted: boolean }>(
        "franchise-interest",
        {
          body: {
            p_interest_type: "catering_enquiry",
            p_full_name: form.contactName,
            p_email: form.email,
            p_phone: form.phone || null,
            p_city: null,
            p_state: null,
            p_investment_budget: null,
            p_business_experience: null,
            p_preferred_date: null,
            p_preferred_time: null,
            p_message: form.message || null,
            p_business_name: form.businessName || null,
            p_event_date: form.eventDate || null,
            p_guest_count: guestCount,
          },
        },
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      window.localStorage.setItem(
        CATERING_ENQUIRY_LAST_SUBMIT_KEY,
        String(Date.now()),
      );
      setCooldownSeconds(
        Math.ceil(CATERING_ENQUIRY_SUBMIT_COOLDOWN_MS / 1000),
      );
      setSubmitted(true);
    } catch {
      toast.error(
        contactEmail
          ? t("errors.submitFailed", { email: contactEmail })
          : t("errors.submitFailedFallback"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Hero */}
      <section className="relative h-[480px] overflow-hidden">
        <Image
          src="/manus-storage/catering__hero.png"
          alt={t("hero.titleLine1")}
          fill
          priority
          className="absolute inset-0 object-cover object-[75%] w-full h-full"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 h-full flex flex-col items-start justify-center px-6 md:px-20 max-w-[1280px] mx-auto">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-4">
            {t("hero.badge")}
          </p>
          <h1 className="font-serif text-white text-5xl md:text-7xl leading-tight max-w-2xl mb-6">
            {t("hero.titleLine1")}
            <br />
            {t("hero.titleLine2")}
          </h1>
          <p className="text-white/65 text-lg max-w-xl leading-relaxed mb-8">
            {t("hero.description")}
          </p>
          <div className="flex flex-wrap gap-3">
            {SHOW_CATERING_PACKS_SECTION ? (
              <a
                href="#catering-packs"
                className="bg-brand-red text-white px-6 py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors inline-flex items-center gap-2"
              >
                {t("hero.ctaPacks")} <ChevronRight size={15} />
              </a>
            ) : null}
            <a
              href="#catering-menu"
              className="bg-white/10 border border-white/40 text-white px-6 py-3 font-semibold text-sm hover:bg-white/20 transition-colors inline-flex items-center gap-2"
            >
              {t("hero.ctaMenu")} <ChevronRight size={15} />
            </a>
            <a
              href="#catering-enquiry-form"
              className="border border-white text-white px-6 py-3 font-semibold text-sm hover:bg-white hover:text-brand-dark transition-colors"
            >
              {t("hero.ctaQuote")}
            </a>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-brand-red text-white py-10">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {statsList.map((s, i) => (
            <div key={i}>
              <div className="font-serif text-4xl font-bold mb-1">{s.num}</div>
              <div className="text-white/65 text-sm font-medium uppercase tracking-wider">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="bg-white py-16">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">
              {t("whyUs.label")}
            </p>
            <h2 className="font-serif text-brand-dark text-4xl">
              {t("whyUs.titleLine1")}
              <br />
              {t("whyUs.titleLine2")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {whyUsList.map((item, i) => (
              <div key={i} className="flex gap-4 p-5 bg-brand-cream">
                <div className="text-3xl flex-shrink-0">{item.emoji}</div>
                <div>
                  <h3 className="font-serif text-brand-dark text-lg mb-1">
                    {item.title}
                  </h3>
                  <p className="text-brand-dark/55 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catering packs — set SHOW_CATERING_PACKS_SECTION to re-enable */}
      {SHOW_CATERING_PACKS_SECTION ? (
      <section id="catering-packs" className="py-16 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-6">
          {guestOrderBlocksCart && resolveOrderWarning ? (
            <div
              id="catering-resolve-order-warning"
              role="alert"
              className="mb-8 rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
            >
              {t("guestOrder.resolveFirst")}
            </div>
          ) : null}
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">
              {t("packs.label")}
            </p>
            <h2 className="font-serif text-brand-dark text-4xl">
              {t("packs.title")}
            </h2>
            <p className="text-brand-dark/55 mt-3 max-w-xl mx-auto text-sm">
              {t("packs.description")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {featuredPacks.length === 0 ? (
              <div className="md:col-span-2 text-center text-sm text-brand-dark/55 py-8">
                {t("packs.empty")}
              </div>
            ) : (
              featuredPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="flex h-full flex-col overflow-hidden bg-white transition-shadow duration-300 hover:shadow-lg [contain-intrinsic-size:520px] [content-visibility:auto]"
                >
                  <div className="relative aspect-[16/7] overflow-hidden">
                    <LazyImage
                      src={pack.img ?? "/placeholder.svg"}
                      alt={pack.name}
                      wrapperClassName="size-full"
                      sizes={CATERING_PACK_CARD_SIZES}
                      unmountWhenHidden
                      className="object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-brand-dark/25" />
                    <span
                      className={`absolute top-4 left-4 ${pack.tagBg} text-white text-[10px] font-bold px-3 py-1 tracking-widest uppercase`}
                    >
                      {pack.tag}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-serif text-brand-dark text-2xl">
                        {pack.name}
                      </h3>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-brand-red text-sm">
                          {pack.price}
                        </div>
                        <div className="text-xs text-brand-dark/40 flex items-center gap-1 justify-end mt-0.5">
                          <Users size={11} />{" "}
                          {t("packs.serves", { serves: pack.serves ?? "" })}
                        </div>
                      </div>
                    </div>
                    <p className="text-brand-dark/60 text-sm leading-relaxed mb-4">
                      {pack.description}
                    </p>
                    <ul className="space-y-1.5 mb-5">
                      {pack.includes.map((inc, j) => (
                        <li
                          key={j}
                          className="flex items-center gap-2 text-sm text-brand-dark/70"
                        >
                          <CheckCircle
                            size={13}
                            className="text-brand-red flex-shrink-0"
                          />{" "}
                          {inc}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-4">
                      <PackOrderButton
                        pack={pack}
                        selectedTier={null}
                        onAdd={() => handleAddPack(pack, null)}
                        orderLabel={t("packs.addToOrder")}
                        quoteLabel={t("packs.quoteRequired")}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      ) : null}

      {/* Catering Menu */}
      <section id="catering-menu" className="py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          {!SHOW_CATERING_PACKS_SECTION &&
          guestOrderBlocksCart &&
          resolveOrderWarning ? (
            <div
              id="catering-resolve-order-warning"
              role="alert"
              className="mb-8 rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
            >
              {t("guestOrder.resolveFirst")}
            </div>
          ) : null}
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">
              {t("menu.label")}
            </p>
            <h2 className="font-serif text-brand-dark text-4xl">
              {t("menu.title")}
            </h2>
            <p className="text-brand-dark/55 mt-3 max-w-2xl mx-auto text-sm">
              {t("menu.description")}
              {contactEmail ? (
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-brand-red underline"
                >
                  {contactEmail}
                </a>
              ) : null}
              {t("menu.descriptionEnd")}
            </p>
          </div>
        </div>

          {menuGroups.length > 0 ? (
            <>
              <div
                id={CATERING_CATEGORIES_ANCHOR}
                className="scroll-mt-20"
                aria-hidden
              />

              <div className="sticky top-16 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] lg:hidden">
                <div className="max-w-[1280px] mx-auto px-6 py-3">
                  <CategorySelect
                    allLabel={allLabel}
                    activeCategoryId={activeCategoryId}
                    onCategorySelect={handleCategoryClick}
                    categories={barCategories}
                    categoryGroups={categoryGroups}
                    label={t("menu.categories.label")}
                    placeholder={t("menu.categories.placeholder")}
                    searchPlaceholder={t("menu.categories.searchPlaceholder")}
                    emptyMessage={t("menu.categories.empty")}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryIconFallback={getCategoryIconFallback}
                    variant="brand"
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
                      activeCategoryId={activeCategoryId}
                      onCategorySelect={handleCategoryClick}
                      categories={barCategories}
                      categoryGroups={categoryGroups}
                      variant="brand"
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
                      placeholder={t("menu.search.placeholder")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-11 pr-10 py-3 border border-gray-200 bg-white text-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/40 transition-colors shadow-sm"
                    />
                    {search ? (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-dark transition-colors text-xs"
                      >
                        {t("menu.search.clearLabel")}
                      </button>
                    ) : null}
                  </div>

                  <div id={CATEGORY_LIST_ANCHOR} className="scroll-mt-24" aria-hidden />

          {visibleMenuGroups.length === 0 ? (
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
                    onClick={() => setSearch("")}
                    className="mt-4 text-brand-red text-sm font-semibold hover:underline"
                  >
                    {t("menu.emptySearch.clearSearch")}
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            visibleMenuGroups.map((group, groupIndex) => (
              <div
                key={`${group.category}-${group.categoryId}`}
                id={
                  group.categoryId != null
                    ? getCategorySectionId(group.categoryId)
                    : undefined
                }
                className="scroll-mt-24"
              >
                <div className="mb-6">
                  <h3 className="font-serif text-brand-dark text-2xl mb-3 pb-2 border-b border-brand-cream">
                    {group.category}
                  </h3>
                  {group.categoryId != null &&
                  categoryDescriptionMap[group.categoryId] ? (
                    <p className="mt-3 text-sm leading-relaxed text-brand-dark/55">
                      {categoryDescriptionMap[group.categoryId]}
                    </p>
                  ) : null}
                </div>
                <div
                  className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-4 xl:gap-6 ${groupIndex === visibleMenuGroups.length - 1 ? "mb-10" : "mb-12"}`}
                >
                  {group.items.map((item) => {
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

                    return (
                    <div
                      key={item.id}
                      className="bg-brand-cream overflow-hidden hover:shadow-md transition-shadow duration-300 group flex flex-col h-full [contain-intrinsic-size:520px] [content-visibility:auto]"
                    >
                      <Link
                        href={cateringItemDetailPath(item, locale)}
                        className="block"
                      >
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
                              className={`absolute top-3 right-3 max-w-[calc(100%-1.5rem)] bg-brand-red px-2.5 py-1 text-right font-bold text-white ${
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
                      <div className="p-5 pt-2 flex flex-col flex-1">
                        {item.serves && (
                          <p className="text-xs text-brand-red font-semibold mb-3 flex items-center gap-1">
                            <Users size={11} />{" "}
                            {t("menu.caters", { serves: item.serves })}
                          </p>
                        )}
                        {item.note ? (
                          <CateringProductHtml
                            html={item.note}
                            className="mb-2 text-xs italic text-brand-dark/50"
                          />
                        ) : null}
                        {item.includes.length > 0 && (
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
                        )}
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
                            <PackOrderButton
                              pack={item}
                              selectedTier={selectedTier}
                              onAdd={() => handleAddPack(item, selectedTier)}
                              orderLabel={t("menu.addToOrder")}
                              quoteLabel={t("menu.customPrice")}
                            />
                          ) : (
                            <button
                              onClick={() =>
                                handleEnquireItem(
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
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Protein note */}
          <div className="bg-brand-dark text-white p-6 text-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-2">
              {t("menu.proteinLabel")}
            </p>
            <p className="text-white/80 text-sm">{t("menu.proteinList")}</p>
            <p className="text-white/50 text-xs mt-2">
              {t("menu.proteinNote")}
            </p>
          </div>
                </div>
              </div>
            </>
          ) : (
            <div className="max-w-[1280px] mx-auto px-6">
              <div className="text-center text-sm text-brand-dark/55 py-6">
                {t("menu.empty")}
              </div>
            </div>
          )}
      </section>

      {/* Testimonial */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <Star size={24} className="text-brand-amber mx-auto mb-6" />
          <blockquote className="font-serif text-white text-2xl md:text-3xl leading-relaxed mb-6">
            {t("testimonial.quote")}
          </blockquote>
          <p className="text-white/50 text-sm font-medium">
            {t("testimonial.author")}
          </p>
        </div>
      </section>

      {/* Enquiry form */}
      <section id="catering-enquiry-form" className="py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">
                {t("form.label")}
              </p>
              <h2 className="font-serif text-brand-dark text-4xl mb-4">
                {t("form.title")}
              </h2>
              <p className="text-brand-dark/55 leading-relaxed mb-6 text-sm">
                {t("form.description")}
              </p>
              <div className="space-y-3 text-sm text-brand-dark/60">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-brand-red" />{" "}
                  {t("form.features.response")}
                </div>
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-brand-red" />{" "}
                  {t("form.features.guests")}
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-brand-red" />{" "}
                  {t("form.features.consultation")}
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-brand-red" />{" "}
                  {t("form.features.delivery")}
                </div>
              </div>
              <div className="mt-8 p-5 bg-brand-cream border-l-4 border-brand-red">
                <p className="font-semibold text-brand-dark text-sm mb-2">
                  {t("form.directLabel")}
                </p>
                {contactPhone ? (
                  <div className="flex items-center gap-2 text-sm text-brand-dark/70 mb-1">
                    <Phone size={13} className="text-brand-red" />
                    <a
                      href={contactPhone.telHref}
                      className="hover:text-brand-red transition-colors"
                    >
                      {contactPhone.display}
                    </a>
                  </div>
                ) : null}
                {contactEmail ? (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-brand-red font-bold hover:underline text-sm"
                  >
                    {contactEmail}
                  </a>
                ) : null}
              </div>
            </div>

            <div>
              {submitted ? (
                <div className="bg-brand-cream p-10 text-center">
                  <CheckCircle
                    size={40}
                    className="text-brand-red mx-auto mb-4"
                  />
                  <h3 className="font-serif text-2xl text-brand-dark mb-2">
                    {t("form.successTitle")}
                  </h3>
                  <p className="text-brand-dark/55 text-sm">
                    {t("form.successText")}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("form.inputName")}
                      </label>
                      <input
                        type="text"
                        required
                        value={form.contactName}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            contactName: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("form.inputOrg")}
                      </label>
                      <input
                        type="text"
                        value={form.businessName}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            businessName: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("form.inputEmail")}
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, email: e.target.value }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("form.inputPhone")}
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("form.inputDate")}
                        <span className="text-brand-red font-normal normal-case text-[10px]">
                          {t("form.inputDateNote")}
                        </span>
                      </label>
                      <input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, eventDate: e.target.value }))
                        }
                        min={(() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          return d.toISOString().split("T")[0];
                        })()}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("form.inputGuests")}
                      </label>
                      <input
                        type="number"
                        min="10"
                        value={form.guestCount}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, guestCount: e.target.value }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                      {t("form.inputMessage")}
                    </label>
                    <textarea
                      rows={4}
                      value={form.message}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, message: e.target.value }))
                      }
                      placeholder={t("form.placeholder")}
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || cooldownSeconds > 0}
                    className="w-full bg-brand-red text-white py-4 font-semibold text-sm hover:bg-brand-red/90 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting
                      ? t("form.btnSending")
                      : t("form.btnSubmit")}
                  </button>
                  {cooldownSeconds > 0 ? (
                    <p className="text-xs font-semibold text-brand-red text-center">
                      {t("form.cooldownWait", { time: cooldownLabel })}
                    </p>
                  ) : null}
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {customiseItem ? (
        <ItemCustomiseModal
          item={customiseItem}
          onConfirm={handleCustomiseConfirm}
          onClose={() => setCustomiseTarget(null)}
        />
      ) : null}
    </div>
  );
}
