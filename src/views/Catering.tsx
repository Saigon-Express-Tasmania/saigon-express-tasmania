"use client";

import AppImage from "@/components/AppImage";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle,
  Users,
  Clock,
  Star,
  ChevronRight,
  MapPin,
  Phone,
  Plus,
} from "lucide-react";
import {
  FEATURED_CATERING_PACK_CATEGORY,
  type CateringPack,
  type CateringTierPrice,
} from "@/lib/supabase/catering-packs";
import { stringToSlug } from "@/lib/utils";
import { useCateringCart } from "@/contexts/CateringCartContext";
import { useGuestCateringOrder } from "@/contexts/GuestCateringOrderContext";
import { shouldBlockGuestCateringCart } from "@/lib/guest-catering-order-session";
import { useSupabase } from "@/hooks/useSupabase";
import { parseCateringPrice } from "@/lib/catering-price";

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
  const unitPrice =
    selectedTier != null
      ? parseCateringPrice(selectedTier.price)
      : parseCateringPrice(pack.price);

  if (unitPrice == null) {
    return (
      <p className="text-xs text-brand-dark/45">{quoteLabel}</p>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex w-full items-center justify-center gap-2 bg-brand-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-red/90 sm:w-auto"
    >
      <Plus size={14} />
      {orderLabel}
    </button>
  );
}

export default function Catering({ packs }: CateringProps) {
  const t = useTranslations("Catering");
  const { isSignedIn } = useSupabase();
  const { addToCart } = useCateringCart();
  const { session, trackedOrder, setLastOrderOpen, isHydrated } =
    useGuestCateringOrder();
  const guestOrderBlocksCart =
    isHydrated &&
    shouldBlockGuestCateringCart(session, trackedOrder, isSignedIn);
  const [resolveOrderWarning, setResolveOrderWarning] = useState(false);
  const [tierSelection, setTierSelection] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    contactName: "",
    email: "",
    phone: "",
    businessName: "",
    eventDate: "",
    guestCount: "",
    message: "",
  });

  // Load configuration arrays from translation files
  const whyUsList: WhyUsItem[] = t.raw("whyUs.items");
  const statsList: StatItem[] = t.raw("stats");

  useEffect(() => {
    if (!guestOrderBlocksCart) {
      setResolveOrderWarning(false);
    }
  }, [guestOrderBlocksCart]);

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

    addToCart({
      productId: pack.id,
      productName: pack.name,
      variantLabel: tier?.size ?? null,
      unitPrice,
      imageUrl: pack.img,
    });
  };

  const submitInquiry = trpc.public.submitPartnerInquiry.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error(t("errors.submitFailed")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactName || !form.email) {
      toast.error(t("errors.requiredFields"));
      return;
    }
    submitInquiry.mutate({
      contactName: form.contactName,
      businessName: form.businessName || form.contactName,
      email: form.email,
      phone: form.phone || undefined,
      message: `${t("form.emailSubjectHeader")}\n${t("form.emailEventDate")}: ${form.eventDate}\n${t("form.emailGuestCount")}: ${form.guestCount}\n\n${form.message}`,
    });
  };

  const featuredPacks = packs.filter(
    (pack) => pack.category === FEATURED_CATERING_PACK_CATEGORY,
  );

  const menuGroups = packs
    .filter((pack) => pack.category !== FEATURED_CATERING_PACK_CATEGORY)
    .reduce<Array<{ category: string; items: CateringPack[] }>>(
      (groups, item) => {
        const existingGroup = groups.find(
          (group) => group.category === item.category,
        );
        if (existingGroup) {
          existingGroup.items.push(item);
        } else {
          groups.push({ category: item.category, items: [item] });
        }
        return groups;
      },
      [],
    );

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
            <a
              href="#catering-packs"
              className="bg-brand-red text-white px-6 py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors inline-flex items-center gap-2"
            >
              {t("hero.ctaPacks")} <ChevronRight size={15} />
            </a>
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

      {/* Catering packs */}
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
                  className="bg-white overflow-hidden hover:shadow-lg transition-shadow duration-300"
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
                  <div className="p-6">
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
                    <PackOrderButton
                      pack={pack}
                      selectedTier={null}
                      onAdd={() => handleAddPack(pack, null)}
                      orderLabel={t("packs.addToOrder")}
                      quoteLabel={t("packs.quoteRequired")}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Catering Menu */}
      <section id="catering-menu" className="py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">
              {t("menu.label")}
            </p>
            <h2 className="font-serif text-brand-dark text-4xl">
              {t("menu.title")}
            </h2>
            <p className="text-brand-dark/55 mt-3 max-w-2xl mx-auto text-sm">
              {t("menu.description")}
              <a
                href={`mailto:${t("menu.descriptionEmail")}`}
                className="text-brand-red underline"
              >
                {t("menu.descriptionEmail")}
              </a>{" "}
              {t("menu.descriptionEnd")}
            </p>
          </div>

          {menuGroups.length === 0 ? (
            <div className="text-center text-sm text-brand-dark/55 py-6">
              {t("menu.empty")}
            </div>
          ) : (
            menuGroups.map((group, groupIndex) => (
              <div key={group.category} id={stringToSlug(group.category)}>
                <div className="mb-4">
                  <h3 className="font-serif text-brand-dark text-2xl mb-6 pb-2 border-b border-brand-cream">
                    {group.category}
                  </h3>
                </div>
                <div
                  className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-6 ${groupIndex === menuGroups.length - 1 ? "mb-10" : "mb-12"}`}
                >
                  {group.items.map((item) => {
                    const selectedTierIndex = tierSelection[item.id] ?? 0;
                    const selectedTier = item.prices[selectedTierIndex] ?? null;
                    const hasOrderPrice =
                      parseCateringPrice(
                        selectedTier?.price ?? item.price ?? item.prices[0]?.price,
                      ) != null;

                    return (
                    <div
                      key={item.id}
                      className="bg-brand-cream overflow-hidden hover:shadow-md transition-shadow duration-300 group flex flex-col h-full"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <AppImage
                          src={item.img ?? "/placeholder.svg"}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {item.price && (
                          <div className="absolute top-3 right-3 bg-brand-red text-white text-sm font-bold px-3 py-1">
                            {item.price}
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h4 className="font-serif text-brand-dark text-xl mb-1">
                          {item.name}
                        </h4>
                        {item.serves && (
                          <p className="text-xs text-brand-red font-semibold mb-3 flex items-center gap-1">
                            <Users size={11} />{" "}
                            {t("menu.caters", { serves: item.serves })}
                          </p>
                        )}
                        {item.note && (
                          <p className="text-xs text-brand-dark/50 italic mb-2">
                            {item.note}
                          </p>
                        )}
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
                        {item.prices.length > 0 ? (
                          <div className="space-y-2 mt-2 mb-4">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark/45">
                              Size
                            </label>
                            <select
                              value={selectedTierIndex}
                              onChange={(event) =>
                                setTierSelection((prev) => ({
                                  ...prev,
                                  [item.id]: Number(event.target.value),
                                }))
                              }
                              className="w-full cursor-pointer rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-red/30"
                            >
                              {item.prices.map((tier, index) => (
                                <option key={index} value={index}>
                                  {tier.size} · {tier.price} ({tier.serves})
                                </option>
                              ))}
                            </select>
                          </div>
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
                            className="w-full bg-brand-red text-white text-xs font-bold py-2.5 px-4 hover:bg-brand-red/90 transition-colors flex items-center justify-center gap-1.5 mt-auto"
                          >
                            {t("menu.enquire")} <ChevronRight size={13} />
                          </button>
                        )}
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
                <div className="flex items-center gap-2 text-sm text-brand-dark/70 mb-1">
                  <Phone size={13} className="text-brand-red" />
                  <a
                    href="tel:0416036016"
                    className="hover:text-brand-red transition-colors"
                  >
                    0416 036 016
                  </a>
                </div>
                <a
                  href="mailto:catering@saigonexpress.com.au"
                  className="text-brand-red font-bold hover:underline text-sm"
                >
                  catering@saigonexpress.com.au
                </a>
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
                    disabled={submitInquiry.isPending}
                    className="w-full bg-brand-red text-white py-4 font-semibold text-sm hover:bg-brand-red/90 transition-colors disabled:opacity-50"
                  >
                    {submitInquiry.isPending
                      ? t("form.btnSending")
                      : t("form.btnSubmit")}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
