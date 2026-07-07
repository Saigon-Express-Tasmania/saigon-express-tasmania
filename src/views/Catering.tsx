"use client";

import CateringMenuCatalog from "@/components/CateringMenuCatalog";
import CateringPackOrderButton from "@/components/CateringPackOrderButton";
import LazyImage from "@/components/LazyImage";
import {
  ItemCustomiseModal,
  type ItemCustomisation,
} from "@/components/ItemCustomiseModal";
import { useEffect, useState, useMemo, useCallback } from "react";
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
import { parseCateringPrice } from "@/lib/catering-price";
import { CATERING_CATEGORIES_ANCHOR } from "@/lib/catering-item-routes";
import type { SiteCategory, SiteCategoryGroup } from "@/types";
import Image from "next/image";

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

export default function Catering({
  packs,
  categoriesContent,
  categoryGroups,
}: CateringProps) {
  const t = useTranslations("Catering");
  const locale = useLocale();
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

  // Load configuration arrays from translation files
  const whyUsList: WhyUsItem[] = t.raw("whyUs.items");
  const statsList: StatItem[] = t.raw("stats");

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
  }, [packs.length]);

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
      setCooldownSeconds(remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0);
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
      toast.error(
        "This item requires a custom quote. Please contact catering.",
      );
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
      const result = await invokeEdgeFunction<{
        id: number;
        submitted: boolean;
      }>("franchise-interest", {
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
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      window.localStorage.setItem(
        CATERING_ENQUIRY_LAST_SUBMIT_KEY,
        String(Date.now()),
      );
      setCooldownSeconds(Math.ceil(CATERING_ENQUIRY_SUBMIT_COOLDOWN_MS / 1000));
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
      <section className="bg-white pt-10 pb-8">
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
      <section id="catering-menu" className="py-4 bg-white">
        {/* <div className="max-w-[1280px] mx-auto px-6">
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
        </div> */}

        <CateringMenuCatalog
          packs={packs}
          categoriesContent={categoriesContent}
          categoryGroups={categoryGroups}
          onAddToOrder={handleAddPack}
          onEnquire={handleEnquireItem}
          locale={locale}
          addDisabled={guestOrderBlocksCart}
        />
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
                    {isSubmitting ? t("form.btnSending") : t("form.btnSubmit")}
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
