"use client";

import AppImage from "@/components/AppImage";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "@/components/link";
import { trpc } from "@/lib/trpc";
import { useRedirectWholesaleMembersToShop } from "@/hooks/useRedirectWholesaleMembersToShop";
import type { WholesalePricingTier, WholesaleProduct } from "@/types";
import {
  formatTierDiscountValue,
  formatTierMinValue,
  pickWholesaleImageUrl,
} from "@/types";
import { toast } from "sonner";
import {
  ChevronRight,
  CheckCircle,
  TrendingDown,
  FileText,
  Truck,
  Users,
  Phone,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingDown,
  FileText,
  Truck,
  Users,
};

export default function Wholesale({
  products = [],
  pricingTiers = [],
}: {
  products: WholesaleProduct[];
  pricingTiers?: WholesalePricingTier[];
}) {
  const t = useTranslations("Wholesale");
  useRedirectWholesaleMembersToShop();

  // Array Extraction Strategy (t.raw)
  const supplyList = (t.raw("supplyList") || []) as Array<{
    emoji: string;
    label: string;
  }>;
  const benefits = (t.raw("benefits") || []) as Array<{
    icon: string;
    title: string;
    desc: string;
  }>;
  const howItWorks = (t.raw("howItWorks") || []) as Array<{
    step: string;
    title: string;
    desc: string;
  }>;
  const partnerPerks = (t.raw("partnerForm.perks") || []) as string[];
  const businessTypes = (t.raw("partnerForm.fields.businessType.options") ||
    []) as string[];
  const volumeRanges = (t.raw("partnerForm.fields.weeklyVolume.options") ||
    []) as string[];

  const imageUrls = products
    .map((p) => pickWholesaleImageUrl(p.imageUrls, [1448, 1024, 512, 256]))
    .filter((url): url is string => Boolean(url));

  const heroImage = imageUrls[0] ?? null;
  const splitImage = imageUrls[1] ?? imageUrls[0] ?? null;

  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    businessType: "",
    estimatedWeeklyVolume: "",
    message: "",
  });

  const submitInquiry = trpc.public.submitPartnerInquiry.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error(t("partnerForm.messages.error")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.contactName || !form.email) {
      toast.error(t("partnerForm.messages.validation"));
      return;
    }
    submitInquiry.mutate({
      businessName: form.businessName,
      contactName: form.contactName,
      email: form.email,
      phone: form.phone || undefined,
      businessType: form.businessType || undefined,
      estimatedWeeklyVolume: form.estimatedWeeklyVolume || undefined,
      message: form.message || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Hero Section */}
      <section className="relative h-[480px] overflow-hidden">
        {heroImage ? (
          <>
            <AppImage
              src={heroImage}
              alt={t("hero.alt")}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/55" />
          </>
        ) : (
          <div className="absolute inset-0 bg-black" />
        )}
        <div className="relative z-10 h-full flex flex-col items-start justify-center px-6 md:px-20 max-w-[1280px] mx-auto">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-4">
            {t("hero.tag")}
          </p>
          <h1 className="font-serif text-white text-5xl md:text-7xl leading-tight max-w-2xl mb-6">
            {t.rich("hero.title", {
              br: () => <br />,
            })}
          </h1>
          <p className="text-white/65 text-lg max-w-xl leading-relaxed mb-8">
            {t("hero.desc")}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#partner-form"
              className="bg-brand-red text-white px-6 py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors inline-flex items-center gap-2"
            >
              {t("hero.ctaPrimary")} <ChevronRight size={15} />
            </a>
            <Link
              href="/wholesale/landing-shop"
              className="border border-white text-white px-6 py-3 font-semibold text-sm hover:bg-white hover:text-brand-dark transition-colors cursor-pointer"
            >
              {t("hero.ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* Who We Supply */}
      <section className="bg-white py-12">
        <div className="max-w-[1280px] mx-auto px-6">
          <p className="text-center text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-8">
            {t("supplyTitle")}
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {supplyList.map((w, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 p-4 bg-brand-cream text-center"
              >
                <span className="text-3xl">{w.emoji}</span>
                <span className="text-xs font-semibold text-brand-dark/70 leading-tight">
                  {w.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">
              {t("benefitsHeading.tag")}
            </p>
            <h2 className="font-serif text-brand-dark text-4xl">
              {t("benefitsHeading.title")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b, i) => {
              const Icon = ICON_MAP[b.icon] || CheckCircle;
              return (
                <div
                  key={i}
                  className="bg-white p-6 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="w-10 h-10 bg-brand-red flex items-center justify-center mb-4">
                    <Icon size={18} className="text-white" />
                  </div>
                  <h3 className="font-serif text-brand-dark text-lg mb-2">
                    {b.title}
                  </h3>
                  <p className="text-brand-dark/55 text-sm leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="bg-brand-dark py-16">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-3">
              {t("pricingHeading.tag")}
            </p>
            <h2 className="font-serif text-white text-4xl">
              {t("pricingHeading.title")}
            </h2>
            <p className="text-white/50 mt-3 text-sm">
              {t("pricingHeading.desc")}
            </p>
          </div>
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`p-5 text-center relative ${tier.popular ? "bg-brand-red" : "bg-white/5 border border-white/10"}`}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-amber text-brand-dark text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest whitespace-nowrap">
                    {tier.label}
                  </span>
                )}
                <div className="font-serif text-white text-3xl font-bold mb-1">
                  {formatTierDiscountValue(tier.discountValue)}
                </div>
                <div className="text-white/50 text-xs uppercase tracking-wider mb-2">
                  {t("pricingHeading.off")}
                </div>
                <div className="text-white text-sm font-semibold">
                  {formatTierMinValue(tier.minValue)}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-xs mt-6">
            {t("pricingHeading.disclaimer")}
          </p>
        </div>
      </section>

      {/* Process Flow */}
      <section className="bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2">
          <div className="relative h-72 lg:min-h-[420px] overflow-hidden">
            {splitImage ? (
              <AppImage
                src={splitImage}
                alt={t("processHeading.alt")}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-black" />
            )}
          </div>
          <div className="p-10 lg:p-16 flex flex-col justify-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-4">
              {t("processHeading.tag")}
            </p>
            <h2 className="font-serif text-brand-dark text-4xl mb-6 whitespace-pre">
              {t.rich("processHeading.title", {
                br: () => <br />,
              })}
            </h2>
            <div className="space-y-4">
              {howItWorks.map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-brand-red font-bold text-sm font-mono flex-shrink-0 w-6">
                    {s.step}
                  </div>
                  <div>
                    <div className="font-semibold text-brand-dark text-sm mb-0.5">
                      {s.title}
                    </div>
                    <div className="text-brand-dark/55 text-sm leading-relaxed">
                      {s.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partner Registration Form */}
      <section id="partner-form" className="py-16 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">
                {t("partnerForm.tag")}
              </p>
              <h2 className="font-serif text-brand-dark text-4xl mb-4">
                {t("partnerForm.title")}
              </h2>
              <p className="text-brand-dark/55 leading-relaxed mb-6 text-sm">
                {t("partnerForm.desc")}
              </p>
              <div className="space-y-3 text-sm text-brand-dark/60">
                {partnerPerks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle size={15} className="text-brand-red" /> {perk}
                  </div>
                ))}
              </div>
              <div className="mt-8 p-5 bg-white border-l-4 border-brand-red">
                <p className="font-semibold text-brand-dark text-sm mb-2">
                  {t("partnerForm.contactInfo.title")}
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
                  href="mailto:info@saigonexpress.com.au"
                  className="text-brand-red font-bold hover:underline text-sm"
                >
                  info@saigonexpress.com.au
                </a>
              </div>
            </div>

            <div className="bg-white p-8">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle
                    size={40}
                    className="text-brand-red mx-auto mb-4"
                  />
                  <h3 className="font-serif text-2xl text-brand-dark mb-2">
                    {t("partnerForm.success.title")}
                  </h3>
                  <p className="text-brand-dark/55 text-sm">
                    {t("partnerForm.success.desc")}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("partnerForm.fields.businessName")} *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.businessName}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            businessName: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("partnerForm.fields.contactName")} *
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
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("partnerForm.fields.email")} *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, email: e.target.value }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("partnerForm.fields.phone")}
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("partnerForm.fields.businessType.label")}
                      </label>
                      <select
                        value={form.businessType}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            businessType: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
                      >
                        <option value="">
                          {t("partnerForm.fields.businessType.placeholder")}
                        </option>
                        {businessTypes.map((type, idx) => (
                          <option key={idx} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("partnerForm.fields.weeklyVolume.label")}
                      </label>
                      <select
                        value={form.estimatedWeeklyVolume}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            estimatedWeeklyVolume: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
                      >
                        <option value="">
                          {t("partnerForm.fields.weeklyVolume.placeholder")}
                        </option>
                        {volumeRanges.map((range, idx) => (
                          <option key={idx} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                      {t("partnerForm.fields.notes")}
                    </label>
                    <textarea
                      rows={3}
                      value={form.message}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, message: e.target.value }))
                      }
                      placeholder={t("partnerForm.fields.notesPlaceholder")}
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitInquiry.isPending}
                    className="w-full bg-brand-red text-white py-4 font-semibold text-sm hover:bg-brand-red/90 transition-colors disabled:opacity-50"
                  >
                    {submitInquiry.isPending
                      ? t("partnerForm.submit.pending")
                      : t("partnerForm.submit.default")}
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
