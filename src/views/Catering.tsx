"use client";

import Link from "@/components/link";
import CateringPackOrderButton from "@/components/CateringPackOrderButton";
import CateringProductHtml from "@/components/CateringProductHtml";
import AppImage from "@/components/AppImage";
import CateringTierSelect from "@/components/CateringTierSelect";
import {
  ItemCustomiseModal,
  type ItemCustomisation,
} from "@/components/ItemCustomiseModal";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
import { stringToSlug } from "@/lib/utils";
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
import { cateringItemDetailPath } from "@/lib/catering-item-routes";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CateringMenuGroup = {
  category: string;
  items: CateringPack[];
  sortOrder: number;
};

function buildCateringMenuGroups(packs: CateringPack[]): CateringMenuGroup[] {
  const groups = packs
    .filter(
      (pack) =>
        pack.isAvailable && pack.category !== FEATURED_CATERING_PACK_CATEGORY,
    )
    .reduce<CateringMenuGroup[]>((acc, item) => {
      const existing = acc.find((group) => group.category === item.category);
      if (existing) {
        existing.items.push(item);
        existing.sortOrder = Math.min(existing.sortOrder, item.sortOrder);
      } else {
        acc.push({
          category: item.category,
          items: [item],
          sortOrder: item.sortOrder,
        });
      }
      return acc;
    }, []);

  return groups
    .filter((group) => group.items.length > 0)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.category.localeCompare(b.category),
    );
}

type CateringProps = {
  packs: CateringPack[];
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

export default function Catering({ packs }: CateringProps) {
  const t = useTranslations("Catering");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [activeCategory, setActiveCategory] = useState(urlCategory || allLabel);

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

  const menuGroups = useMemo(
    () => buildCateringMenuGroups(availablePacks),
    [availablePacks],
  );

  const categories = useMemo(
    () => [allLabel, ...menuGroups.map((group) => group.category)],
    [allLabel, menuGroups],
  );

  const visibleMenuGroups = useMemo(() => {
    if (activeCategory === allLabel) return menuGroups;
    return menuGroups.filter((group) => group.category === activeCategory);
  }, [activeCategory, allLabel, menuGroups]);

  const handleCategoryClick = useCallback(
    (cat: string) => {
      setActiveCategory(cat);

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

  const categoryButtonClass = (cat: string) =>
    `shrink-0 px-4 py-2 text-sm font-semibold transition-colors border ${
      activeCategory === cat
        ? "bg-brand-red text-white border-brand-red"
        : "bg-transparent text-brand-dark/60 border-gray-200 hover:border-brand-red/40 hover:text-brand-dark"
    }`;

  // Load configuration arrays from translation files
  const whyUsList: WhyUsItem[] = t.raw("whyUs.items");
  const statsList: StatItem[] = t.raw("stats");

  useEffect(() => {
    if (!urlCategory) {
      setActiveCategory(allLabel);
      return;
    }

    const matchedCategory = menuGroups.find(
      (group) => group.category === urlCategory,
    );
    setActiveCategory(matchedCategory ? urlCategory : allLabel);
  }, [urlCategory, menuGroups, allLabel]);

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
        <div className="absolute inset-0 bg-black" />
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
                  className="flex h-full flex-col overflow-hidden bg-white transition-shadow duration-300 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/7] overflow-hidden">
                    <AppImage
                      src={pack.img ?? "/placeholder.svg"}
                      alt={pack.name}
                      fill
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

          {menuGroups.length > 0 ? (
            <div
              id="catering-categories"
              className="sticky top-16 z-40 mb-10 -mx-6 border-y border-gray-100 bg-white px-6 py-3 md:mx-0 md:rounded-lg md:border md:shadow-sm"
            >
              <div className="md:hidden">
                <Label
                  htmlFor="catering-category-select"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-brand-dark/60"
                >
                  {t("menu.categories.label")}
                </Label>
                <Select
                  value={activeCategory}
                  onValueChange={handleCategoryClick}
                >
                  <SelectTrigger
                    id="catering-category-select"
                    className="h-14 rounded-lg border-gray-200 bg-white px-4 text-base font-semibold text-brand-dark shadow-sm hover:border-brand-red/30 focus-visible:border-brand-red focus-visible:ring-brand-red/20 [&>svg]:text-brand-red/70"
                    iconClassName="text-brand-red/70"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    sideOffset={6}
                    className="max-h-[min(24rem,70vh)] border-gray-200 shadow-xl"
                  >
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                        className="rounded-lg px-3 py-3 data-[highlighted]:bg-brand-red/5 data-[state=checked]:bg-brand-red data-[state=checked]:text-white"
                      >
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden flex-wrap gap-2 md:flex">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className={categoryButtonClass(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {menuGroups.length === 0 ? (
            <div className="text-center text-sm text-brand-dark/55 py-6">
              {t("menu.empty")}
            </div>
          ) : visibleMenuGroups.length === 0 ? (
            <div className="text-center text-sm text-brand-dark/55 py-6">
              {t("menu.emptyCategory")}
            </div>
          ) : (
            visibleMenuGroups.map((group, groupIndex) => (
              <div key={group.category} id={stringToSlug(group.category)}>
                <div className="mb-4">
                  <h3 className="font-serif text-brand-dark text-2xl mb-6 pb-2 border-b border-brand-cream">
                    {group.category}
                  </h3>
                </div>
                <div
                  className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-6 ${groupIndex === visibleMenuGroups.length - 1 ? "mb-10" : "mb-12"}`}
                >
                  {group.items.map((item) => {
                    const selectedTierIndex = tierSelection[item.id] ?? 0;
                    const selectedTier = item.prices[selectedTierIndex] ?? null;
                    const hasOrderPrice =
                      parseCateringPrice(
                        selectedTier?.price ?? item.price ?? item.prices[0]?.price,
                      ) != null;

                    const cardPriceLabel = formatCateringPackCardPriceLabel(
                      item.price,
                      item.prices.map((tier) => tier.price),
                    );

                    return (
                    <div
                      key={item.id}
                      className="bg-brand-cream overflow-hidden hover:shadow-md transition-shadow duration-300 group flex flex-col h-full"
                    >
                      <Link
                        href={cateringItemDetailPath(item, locale)}
                        className="block"
                      >
                        <div className="relative aspect-square overflow-hidden">
                          <AppImage
                            src={item.img ?? "/placeholder.svg"}
                            alt={item.name}
                            fill
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
