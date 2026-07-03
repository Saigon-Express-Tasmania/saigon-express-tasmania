"use client";

import AppImage from "@/components/AppImage";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { useFormattedContactPhone } from "@/hooks/useFormattedContactPhone";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import { toast } from "sonner";
import {
  CheckCircle,
  ChevronRight,
  Phone,
  MapPin,
  TrendingUp,
  Users,
  Award,
  Utensils,
  BookOpen,
  HeartHandshake,
  Calendar,
  MessageCircle,
  X,
} from "lucide-react";
import { AnimationOnScroll } from "@/components/AnimationOnScroll";
import Image from "next/image";

// Lucide icon dictionary mapping
const ICON_MAP: Record<
  string,
  React.ComponentType<{ size: number; className?: string }>
> = {
  Award,
  Utensils,
  BookOpen,
  TrendingUp,
  Users,
  HeartHandshake,
};

interface BenefitItem {
  icon: string;
  title: string;
  desc: string;
}

interface StripItem {
  num: string;
  label: string;
}

interface FormatItem {
  name: string;
  icon: string;
  desc: string;
  investment: string;
}

interface StepItem {
  num: string;
  title: string;
  desc: string;
}

const FRANCHISE_SUBMIT_COOLDOWN_MS = 2 * 60 * 1000;
const FRANCHISE_LAST_SUBMIT_KEY = "franchise_interest_last_submit_at";
const CONSULT_SUBMIT_COOLDOWN_MS = 2 * 60 * 1000;
const CONSULT_LAST_SUBMIT_KEY = "franchise_consult_last_submit_at";

export default function FranchisePage() {
  const t = useTranslations("Franchise");
  const contactEmail = useSiteSetting("contact_us_email")?.trim();
  const contactPhone = useFormattedContactPhone();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [interestCooldownSeconds, setInterestCooldownSeconds] = useState(0);
  const [isSubmittingConsult, setIsSubmittingConsult] = useState(false);
  const [consultCooldownSeconds, setConsultCooldownSeconds] = useState(0);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    investmentBudget: "",
    hasExperience: "no",
    message: "",
  });

  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultSubmitted, setConsultSubmitted] = useState(false);
  const [consultForm, setConsultForm] = useState({
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  });

  const investmentStrip: StripItem[] = t.raw("investmentStrip");
  const aboutChecklist: string[] = t.raw("about.checklist");
  const formatsList: FormatItem[] = t.raw("formats.items");
  const processSteps: StepItem[] = t.raw("process.steps");

  const rawBenefits = t.raw("benefits.items");
  const benefitsList: BenefitItem[] = [
    { icon: "Award", title: rawBenefits[0].title, desc: rawBenefits[0].desc },
    {
      icon: "Utensils",
      title: rawBenefits[1].title,
      desc: rawBenefits[1].desc,
    },
    {
      icon: "BookOpen",
      title: rawBenefits[2].title,
      desc: rawBenefits[2].desc,
    },
    {
      icon: "TrendingUp",
      title: rawBenefits[3].title,
      desc: rawBenefits[3].desc,
    },
    { icon: "Users", title: rawBenefits[4].title, desc: rawBenefits[4].desc },
    {
      icon: "HeartHandshake",
      title: rawBenefits[5].title,
      desc: rawBenefits[5].desc,
    },
  ];

  const interestCheckpoints: string[] = t.raw("interestForm.checkpoints");

  useEffect(() => {
    const updateCooldown = () => {
      const lastSubmitAt = Number(
        window.localStorage.getItem(FRANCHISE_LAST_SUBMIT_KEY) ?? "0",
      );
      const remainingMs =
        lastSubmitAt + FRANCHISE_SUBMIT_COOLDOWN_MS - Date.now();
      setInterestCooldownSeconds(
        remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0,
      );
    };

    updateCooldown();
    const timerId = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    const updateCooldown = () => {
      const lastSubmitAt = Number(
        window.localStorage.getItem(CONSULT_LAST_SUBMIT_KEY) ?? "0",
      );
      const remainingMs =
        lastSubmitAt + CONSULT_SUBMIT_COOLDOWN_MS - Date.now();
      setConsultCooldownSeconds(
        remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0,
      );
    };

    updateCooldown();
    const timerId = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) {
      toast.error(t("toasts.requiredMain"));
      return;
    }

    if (interestCooldownSeconds > 0) {
      const minutes = Math.floor(interestCooldownSeconds / 60);
      const seconds = interestCooldownSeconds % 60;
      const prettyRemaining = `${minutes}:${String(seconds).padStart(2, "0")}`;
      toast.error(`Please wait ${prettyRemaining} before submitting again.`);
      return;
    }

    setIsSubmittingInterest(true);
    try {
      const result = await invokeEdgeFunction<{ id: number; submitted: boolean }>(
        "franchise-interest",
        {
          body: {
            p_interest_type: "franchise",
            p_full_name: form.fullName,
            p_email: form.email,
            p_phone: form.phone || null,
            p_city: form.city || null,
            p_state: "Tasmania",
            p_investment_budget: form.investmentBudget || null,
            p_business_experience:
              form.hasExperience === "yes"
                ? t("interestForm.experiencePayloadYes")
                : t("interestForm.experiencePayloadNo"),
            p_preferred_date: null,
            p_preferred_time: null,
            p_message: form.message || null,
          },
        },
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      window.localStorage.setItem(
        FRANCHISE_LAST_SUBMIT_KEY,
        String(Date.now()),
      );
      setInterestCooldownSeconds(
        Math.ceil(FRANCHISE_SUBMIT_COOLDOWN_MS / 1000),
      );
      setSubmitted(true);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setIsSubmittingInterest(false);
    }
  };

  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !consultForm.name ||
      !consultForm.email ||
      !consultForm.phone ||
      !consultForm.preferredDate
    ) {
      toast.error(t("toasts.requiredConsult"));
      return;
    }

    if (consultCooldownSeconds > 0) {
      const minutes = Math.floor(consultCooldownSeconds / 60);
      const seconds = consultCooldownSeconds % 60;
      const prettyRemaining = `${minutes}:${String(seconds).padStart(2, "0")}`;
      toast.error(`Please wait ${prettyRemaining} before submitting again.`);
      return;
    }

    setIsSubmittingConsult(true);
    try {
      const result = await invokeEdgeFunction<{ id: number; submitted: boolean }>(
        "franchise-interest",
        {
          body: {
            p_interest_type: "consultation",
            p_full_name: consultForm.name,
            p_email: consultForm.email,
            p_phone: consultForm.phone || null,
            p_city: null,
            p_state: "Tasmania",
            p_investment_budget: null,
            p_business_experience: null,
            p_preferred_date: consultForm.preferredDate || null,
            p_preferred_time: consultForm.preferredTime || null,
            p_message: consultForm.message || null,
          },
        },
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      window.localStorage.setItem(CONSULT_LAST_SUBMIT_KEY, String(Date.now()));
      setConsultCooldownSeconds(Math.ceil(CONSULT_SUBMIT_COOLDOWN_MS / 1000));
      setConsultSubmitted(true);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setIsSubmittingConsult(false);
    }
  };

  const interestCooldownLabel = `${Math.floor(interestCooldownSeconds / 60)}:${String(
    interestCooldownSeconds % 60,
  ).padStart(2, "0")}`;
  const consultCooldownLabel = `${Math.floor(consultCooldownSeconds / 60)}:${String(
    consultCooldownSeconds % 60,
  ).padStart(2, "0")}`;

  return (
    <>
      <AnimationOnScroll />
      <div className="min-h-screen bg-brand-cream font-sans overflow-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[500px] flex items-center justify-center overflow-hidden py-16 md:py-24 lg:py-30 pt-8">
          {/* use Next/Image for this */}
          <Image
            src="/manus-storage/franchise__hero.png"
            alt={t("hero.titleLine1")}
            fill
            priority
            className="absolute inset-0 object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

          <div className="relative z-10 w-full px-6 md:px-20 max-w-[1280px] mx-auto flex flex-col items-center text-center">
            <div data-aos="fade-down" data-aos-duration="1000">
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-6">
                {t("hero.badge")}
              </span>
            </div>

            <h1
              data-aos="fade-up"
              data-aos-duration="1200"
              data-aos-delay="200"
              className="font-serif text-white text-5xl md:text-7xl lg:text-8xl leading-tight max-w-5xl mb-6 drop-shadow-2xl"
            >
              {t("hero.titleLine1")}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                {t("hero.titleLine2")}
              </span>
            </h1>

            <p
              data-aos="fade-up"
              data-aos-duration="1200"
              data-aos-delay="400"
              className="text-white/80 text-lg md:text-xl max-w-2xl leading-relaxed mb-10 font-light"
            >
              {t("hero.description")}
            </p>

            <div
              data-aos="fade-up"
              data-aos-duration="1200"
              data-aos-delay="600"
              className="flex flex-col sm:flex-row flex-wrap items-center gap-4"
            >
              <a
                href="#franchise-form"
                className="group relative overflow-hidden rounded-full bg-brand-red text-white px-8 py-4 font-semibold text-sm transition-all duration-300 hover:shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:-translate-y-1 inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t("hero.ctaInterest")}{" "}
                  <ChevronRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              </a>
              <a
                href="#models"
                className="rounded-full border border-white/30 backdrop-blur-sm text-white px-8 py-4 font-semibold text-sm hover:bg-white hover:text-brand-dark transition-all duration-300 w-full sm:w-auto text-center"
              >
                {t("hero.ctaModels")}
              </a>
            </div>
          </div>
        </section>

        {/* Investment Summary Strip */}
        <section className="relative z-20 -mt-10 mx-6">
          <div
            data-aos="fade-up"
            className="max-w-[1000px] mx-auto bg-brand-red rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
              {investmentStrip.map((s, i) => (
                <div
                  key={i}
                  data-aos="zoom-in"
                  data-aos-delay={i * 100}
                  className="px-6 py-10 text-center hover:bg-white/5 transition-colors duration-300"
                >
                  <div className="font-serif text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-md">
                    {s.num}
                  </div>
                  <div className="text-white/80 text-xs font-semibold uppercase tracking-widest leading-tight">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-24 bg-white">
          <div className="max-w-[1280px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div
              data-aos="fade-right"
              className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl group"
            >
              <div className="absolute inset-0 bg-brand-dark/10 group-hover:bg-transparent transition-colors duration-500 z-10" />
              <AppImage
                src="/manus-storage/IMG_43782_5753892a.jpg"
                alt="Saigon Express opens new store"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-lg border border-white/20">
                <p className="text-brand-red font-bold text-lg">
                  {t("about.imageOverlayTitle")}
                </p>
                <p className="text-brand-dark/60 text-xs">
                  {t("about.imageOverlaySubtitle")}
                </p>
              </div>
            </div>

            <div data-aos="fade-left" className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-3 mb-6">
                <span className="h-px w-10 bg-brand-red" />
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red">
                  {t("about.label")}
                </p>
              </div>
              <h2 className="font-serif text-brand-dark text-4xl lg:text-5xl mb-6 leading-[1.1]">
                {t("about.titleLine1")}
                <br />
                <span className="text-brand-red">{t("about.titleLine2")}</span>
              </h2>
              <p className="text-brand-dark/60 text-base leading-relaxed mb-4">
                {t("about.desc1")}
              </p>
              <p className="text-brand-dark/60 text-base leading-relaxed mb-8">
                {t("about.desc2")}
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8 text-sm">
                {aboutChecklist.map((f, i) => (
                  <div
                    key={i}
                    data-aos="fade-up"
                    data-aos-delay={i * 100}
                    className="flex items-center gap-3 bg-brand-cream/50 p-3 rounded-xl border border-brand-dark/5"
                  >
                    <div className="bg-white rounded-full p-1 shadow-sm">
                      <CheckCircle
                        size={16}
                        className="text-brand-red flex-shrink-0"
                      />
                    </div>
                    <span className="text-brand-dark/80 font-medium">{f}</span>
                  </div>
                ))}
              </div>

              <div
                data-aos="fade-up"
                className="p-5 bg-gradient-to-br from-brand-cream to-white rounded-2xl border border-brand-dark/10 text-sm shadow-inner"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-brand-red/10 rounded-full text-brand-red shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div className="text-brand-dark/60 leading-relaxed">
                    <strong className="text-brand-dark">
                      {t("about.legalLabel")}
                    </strong>{" "}
                    {t("about.legalValue")}
                    <br />
                    <strong className="text-brand-dark mt-2 inline-block">
                      {t("about.addressLabel")}
                    </strong>{" "}
                    {t("about.addressValue")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 bg-brand-cream relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-dark/10 to-transparent" />
          <div className="max-w-[1280px] mx-auto px-6">
            <div
              className="text-center mb-16 max-w-3xl mx-auto"
              data-aos="fade-up"
            >
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-4">
                {t("benefits.label")}
              </p>
              <h2 className="font-serif text-brand-dark text-4xl lg:text-5xl leading-tight">
                {t("benefits.titleLine1")}
                <br />
                {t("benefits.titleLine2")}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefitsList.map((b, i) => {
                const TargetIcon = ICON_MAP[b.icon] || Award;
                return (
                  <div
                    key={i}
                    data-aos="fade-up"
                    data-aos-delay={i * 100}
                    className="group bg-white p-8 rounded-3xl border border-transparent hover:border-brand-red/10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(220,38,38,0.15)] transition-all duration-500 hover:-translate-y-2"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-brand-cream group-hover:bg-brand-red flex items-center justify-center mb-6 transition-colors duration-500">
                      <TargetIcon
                        size={24}
                        className="text-brand-red group-hover:text-white transition-colors duration-500"
                      />
                    </div>
                    <h3 className="font-serif text-brand-dark text-xl font-semibold mb-3">
                      {b.title}
                    </h3>
                    <p className="text-brand-dark/60 text-sm leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Franchise Formats Section */}
        <section
          id="models"
          className="relative py-24 lg:py-32 bg-white overflow-hidden"
        >
          {/* Ambient drops */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-brand-red/[0.03] blur-3xl translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 h-[600px] w-[600px] rounded-full bg-brand-dark/[0.03] blur-3xl -translate-x-1/3 translate-y-1/3" />
          </div>

          <div className="relative max-w-[1280px] mx-auto px-6 grid lg:grid-cols-12 gap-12 lg:gap-20">
            <div
              className="lg:col-span-4 lg:sticky lg:top-32 self-start"
              data-aos="fade-right"
            >
              <div className="inline-flex items-center gap-3 mb-6">
                <span className="h-px w-10 bg-brand-red/50" />
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red">
                  {t("formats.label")}
                </p>
              </div>
              <h2 className="font-serif text-brand-dark text-4xl lg:text-5xl leading-[1.1] tracking-tight mb-6">
                {t("formats.title")}
              </h2>
              <p className="text-brand-dark/60 text-base leading-relaxed mb-8">
                {t("formats.description")}
              </p>
              <div className="p-5 bg-brand-cream rounded-2xl border-l-4 border-brand-red">
                <p className="text-brand-dark/60 text-sm italic">
                  {t("formats.investmentNote")}
                </p>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-8">
              {formatsList.map((m, i) => {
                const featured = i === 0;
                return (
                  <article
                    key={i}
                    data-aos="fade-up"
                    data-aos-delay={i * 150}
                    className={`group relative grid sm:grid-cols-5 overflow-hidden rounded-3xl border transition-all duration-500 hover:-translate-y-2
                    ${
                      featured
                        ? "bg-brand-red text-white border-brand-red shadow-[0_25px_70px_-20px_rgba(220,38,38,0.4)]"
                        : "bg-white text-brand-dark border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)]"
                    }
                  `}
                  >
                    <div className="sm:col-span-2 relative h-64 sm:h-auto overflow-hidden">
                      <div className="absolute inset-0 bg-black/10 z-10 group-hover:bg-transparent transition-colors duration-500" />
                      <AppImage
                        src={`/manus-storage/franchise__${m.name.toLocaleLowerCase()}.jpg`}
                        alt={m.name}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-110"
                      />
                      {featured && (
                        <span className="absolute top-4 left-4 z-20 rounded-full bg-white text-brand-red text-[10px] font-bold tracking-[0.2em] uppercase px-4 py-2 shadow-lg">
                          Dẫn đầu xu hướng
                        </span>
                      )}
                    </div>

                    <div className="sm:col-span-3 p-8 lg:p-10 flex flex-col">
                      <h3
                        className={`font-serif text-2xl lg:text-3xl leading-tight mb-4 ${featured ? "text-white" : "text-brand-dark"}`}
                      >
                        {m.name}
                      </h3>
                      <p
                        className={`text-sm leading-relaxed mb-8 ${featured ? "text-white/80" : "text-brand-dark/60"}`}
                      >
                        {m.desc}
                      </p>

                      <div
                        className={`mt-auto pt-6 border-t ${featured ? "border-white/20" : "border-brand-dark/10"} flex items-center justify-between`}
                      >
                        <div>
                          <div
                            className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${featured ? "text-white/60" : "text-brand-dark/40"}`}
                          >
                            {t("formats.investmentLabel")}
                          </div>
                          <div
                            className={`font-serif text-2xl lg:text-3xl font-semibold ${featured ? "text-white drop-shadow-md" : "text-brand-dark"}`}
                          >
                            {m.investment}
                          </div>
                        </div>
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500 group-hover:scale-110 group-hover:rotate-12
                          ${featured ? "bg-white text-brand-red shadow-lg" : "bg-brand-cream text-brand-dark"}
                        `}
                        >
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Process Section */}
        {/* Process Section - UPGRADED UI */}
        <section className="py-24 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
          {/* Abstract ambient glowing shapes */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-red/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-amber/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

          {/* Subtle Grid texture for modern aesthetic */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="max-w-[1280px] mx-auto px-6 relative z-10">
            <div
              className="flex flex-col items-center text-center mb-20"
              data-aos="fade-up"
            >
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm shadow-lg">
                <span className="w-2 h-2 rounded-full bg-brand-amber animate-pulse" />
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber">
                  {t("process.label")}
                </p>
              </div>
              <h2 className="font-serif text-white text-4xl lg:text-5xl xl:text-6xl tracking-tight leading-[1.15]">
                {t("process.title")}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 relative">
              {processSteps.map((s, i) => (
                <div
                  key={i}
                  data-aos="fade-up"
                  data-aos-delay={i * 250}
                  className="group relative bg-[#141414]/80 backdrop-blur-md rounded-3xl p-8 lg:p-10 border border-white/5 hover:border-brand-amber/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] overflow-hidden"
                >
                  {/* Internal hover glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-amber/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Giant Number Watermark */}
                  <div className="absolute -bottom-6 -right-4 text-9xl font-serif font-black text-white/[0.02] group-hover:text-brand-amber/[0.05] group-hover:-translate-y-4 transition-all duration-700 pointer-events-none select-none">
                    {s.num}
                  </div>

                  {/* Progress Line */}
                  <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden relative z-10">
                    <div className="h-full bg-brand-amber w-1/4 group-hover:w-full transition-all duration-700 ease-out" />
                  </div>

                  {/* Step Badge & Arrow */}
                  <div className="flex flex-col gap-y-4">
                    <h3 className="font-serif text-white text-2xl mb-4 relative z-10 group-hover:text-brand-amber transition-colors duration-300">
                      {s.title}
                    </h3>

                    <p className="text-white/50 text-sm leading-relaxed relative z-10 group-hover:text-white/80 transition-colors duration-300">
                      {s.desc}
                    </p>
                    <div className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-brand-amber group-hover:border-brand-amber group-hover:text-[#141414] text-white transition-all duration-500">
                      <ChevronRight
                        size={18}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Consultation Banner */}
        <section
          className="relative py-28 px-6 overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, #dc2626 0%, #991b1b 50%, #7f1d1d 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div
            className="relative z-10 max-w-3xl mx-auto text-center"
            data-aos="zoom-in"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white text-xs font-bold tracking-[0.2em] uppercase px-6 py-2.5 rounded-full mb-8 border border-white/20 shadow-lg">
              <Calendar size={14} />
              {t("consultBanner.badge")}
            </div>
            <h2 className="font-serif text-white text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight drop-shadow-lg">
              {t("consultBanner.title")}
            </h2>
            <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              {t("consultBanner.description")}
            </p>
            <button
              onClick={() => setConsultModalOpen(true)}
              className="group inline-flex items-center gap-3 bg-white text-brand-red font-bold text-base px-10 py-5 rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
            >
              <MessageCircle size={22} className="group-hover:animate-bounce" />
              {t("consultBanner.btnBook")}
            </button>
          </div>
        </section>

        {/* Application Form */}
        <section id="franchise-form" className="py-24 bg-brand-cream relative">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col lg:flex-row">
              {/* Info Column */}
              <div className="lg:w-5/12 p-10 lg:p-16 bg-gradient-to-br from-brand-dark to-black text-white relative overflow-hidden">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-red/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-brand-amber/10 rounded-full blur-3xl" />

                <div className="relative z-10" data-aos="fade-right">
                  <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-4">
                    {t("interestForm.label")}
                  </p>
                  <h2 className="font-serif text-4xl lg:text-5xl mb-6">
                    {t("interestForm.title")}
                  </h2>
                  <p className="text-white/70 leading-relaxed mb-10 text-sm">
                    {t("interestForm.description")}
                  </p>
                  <div className="space-y-4 text-sm text-white/80 mb-12">
                    {interestCheckpoints.map((cp, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="bg-brand-red/20 p-1.5 rounded-full">
                          <CheckCircle size={16} className="text-brand-red" />
                        </div>
                        {cp}
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                    <p className="font-serif text-lg mb-4 text-brand-amber">
                      {t("interestForm.asideTitle")}
                    </p>
                    <div className="space-y-3">
                      {contactPhone ? (
                        <a
                          href={contactPhone.telHref}
                          className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <Phone size={14} className="text-brand-amber" />
                          </div>
                          {contactPhone.display}
                        </a>
                      ) : null}
                      <div className="flex items-center gap-3 text-sm text-white/80">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <MapPin size={14} className="text-brand-amber" />
                        </div>
                        <span>Level 2, 86 Collins St, Hobart TAS 7000</span>
                      </div>
                      {contactEmail ? (
                        <a
                          href={`mailto:${contactEmail}`}
                          className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-brand-red/20 flex items-center justify-center">
                            <MessageCircle
                              size={14}
                              className="text-brand-red"
                            />
                          </div>
                          <span className="font-medium text-brand-red">
                            {contactEmail}
                          </span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Column */}
              <div className="lg:w-7/12 p-10 lg:p-16">
                {submitted ? (
                  <div
                    className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12"
                    data-aos="zoom-in"
                  >
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center">
                      <CheckCircle size={48} className="text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-serif text-3xl text-brand-dark mb-3">
                        {t("interestForm.successTitle")}
                      </h3>
                      <p className="text-brand-dark/60 text-base max-w-md mx-auto">
                        {t("interestForm.successText")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    data-aos="fade-left"
                  >
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputName")}
                        </label>
                        <input
                          type="text"
                          required
                          value={form.fullName}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, fullName: e.target.value }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputEmail")}
                        </label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, email: e.target.value }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputPhone")}
                        </label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, phone: e.target.value }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputLocation")}
                        </label>
                        <input
                          type="text"
                          placeholder={t("interestForm.placeholderLocation")}
                          value={form.city}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, city: e.target.value }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputBudget")}
                        </label>
                        <select
                          value={form.investmentBudget}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              investmentBudget: e.target.value,
                            }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none appearance-none"
                        >
                          <option value="">
                            {t("interestForm.placeholderBudget")}
                          </option>
                          <option>$80K – $120K (Kiosk)</option>
                          <option>$120K – $180K (Takeaway)</option>
                          <option>$180K – $280K (Restaurant)</option>
                          <option>$280K+ (Multiple sites)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputExperience")}
                        </label>
                        <select
                          value={form.hasExperience}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              hasExperience: e.target.value,
                            }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none appearance-none"
                        >
                          <option value="no">
                            {t("interestForm.experienceOptions.no")}
                          </option>
                          <option value="yes">
                            {t("interestForm.experienceOptions.yes")}
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                        {t("interestForm.inputAbout")}
                      </label>
                      <textarea
                        rows={4}
                        value={form.message}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, message: e.target.value }))
                        }
                        placeholder={t("interestForm.placeholderAbout")}
                        className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={
                        isSubmittingInterest || interestCooldownSeconds > 0
                      }
                      className="w-full bg-brand-red text-white py-4 mt-4 rounded-xl font-bold text-sm hover:bg-brand-red/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {isSubmittingInterest
                        ? t("interestForm.btnSubmitting")
                        : t("interestForm.btnSubmit")}
                    </button>
                    {interestCooldownSeconds > 0 && (
                      <p className="text-xs font-semibold text-brand-red text-center">
                        Please wait {interestCooldownLabel} before submitting
                        again.
                      </p>
                    )}
                    <p className="text-[11px] text-brand-dark/40 text-center uppercase tracking-widest mt-4">
                      {t("interestForm.confidentialNote")}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Modal Overlay (Glassmorphism effect added) */}
        {consultModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
            onClick={() => setConsultModalOpen(false)}
          >
            <div
              data-aos="zoom-in"
              data-aos-duration="300"
              className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-brand-dark">
                    {t("consultModal.title")}
                  </h3>
                  <p className="text-sm text-brand-dark/50 mt-1">
                    {t("consultModal.subtitle")}
                  </p>
                </div>
                <button
                  onClick={() => setConsultModalOpen(false)}
                  className="p-2 rounded-full hover:bg-red-50 hover:text-brand-red transition-colors"
                >
                  <X
                    size={20}
                    className="text-brand-dark/50 hover:text-brand-red"
                  />
                </button>
              </div>

              {consultSubmitted ? (
                <div className="px-8 py-14 text-center">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} className="text-green-500" />
                  </div>
                  <h4 className="font-serif text-2xl font-bold text-brand-dark mb-3">
                    {t("consultModal.successTitle")}
                  </h4>
                  <p className="text-brand-dark/60 text-sm leading-relaxed mb-8">
                    {t("consultModal.successText", {
                      name: consultForm.name,
                      email: consultForm.email,
                    })}
                  </p>
                  <button
                    onClick={() => {
                      setConsultModalOpen(false);
                      setConsultSubmitted(false);
                      setConsultForm({
                        name: "",
                        email: "",
                        phone: "",
                        preferredDate: "",
                        preferredTime: "",
                        message: "",
                      });
                    }}
                    className="bg-brand-red text-white px-10 py-3.5 rounded-full font-bold text-sm hover:bg-brand-red/90 hover:shadow-lg transition-all"
                  >
                    {t("consultModal.btnClose")}
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleConsultSubmit}
                  className="px-8 py-8 space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                        {t("consultModal.inputName")}
                      </label>
                      <input
                        required
                        value={consultForm.name}
                        onChange={(e) =>
                          setConsultForm((f) => ({
                            ...f,
                            name: e.target.value,
                          }))
                        }
                        className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none"
                        placeholder={t("consultModal.placeholderName")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                        {t("consultModal.inputPhone")}
                      </label>
                      <input
                        required
                        value={consultForm.phone}
                        onChange={(e) =>
                          setConsultForm((f) => ({
                            ...f,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none"
                        placeholder={t("consultModal.placeholderPhone")}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                      {t("consultModal.inputEmail")}
                    </label>
                    <input
                      required
                      type="email"
                      value={consultForm.email}
                      onChange={(e) =>
                        setConsultForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none"
                      placeholder={t("consultModal.placeholderEmail")}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                        {t("consultModal.inputDate")}
                      </label>
                      <input
                        type="date"
                        required
                        value={consultForm.preferredDate}
                        onChange={(e) =>
                          setConsultForm((f) => ({
                            ...f,
                            preferredDate: e.target.value,
                          }))
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                        {t("consultModal.inputTime")}
                      </label>
                      <select
                        value={consultForm.preferredTime}
                        onChange={(e) =>
                          setConsultForm((f) => ({
                            ...f,
                            preferredTime: e.target.value,
                          }))
                        }
                        className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none appearance-none"
                      >
                        <option value="">
                          {t("consultModal.timeOptions.any")}
                        </option>
                        <option value="Morning (9am–12pm)">
                          {t("consultModal.timeOptions.morning")}
                        </option>
                        <option value="Afternoon (12pm–5pm)">
                          {t("consultModal.timeOptions.afternoon")}
                        </option>
                        <option value="Evening (5pm–7pm)">
                          {t("consultModal.timeOptions.evening")}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                      {t("consultModal.inputMessage")}
                    </label>
                    <textarea
                      rows={3}
                      value={consultForm.message}
                      onChange={(e) =>
                        setConsultForm((f) => ({
                          ...f,
                          message: e.target.value,
                        }))
                      }
                      className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none resize-none"
                      placeholder={t("consultModal.placeholderMessage")}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingConsult || consultCooldownSeconds > 0}
                    className="w-full bg-brand-red text-white py-4 mt-2 rounded-xl font-bold text-sm hover:bg-brand-red/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                  >
                    {isSubmittingConsult ? (
                      t("consultModal.btnSubmitting")
                    ) : (
                      <>
                        <MessageCircle size={18} />{" "}
                        {t("consultModal.btnSubmit")}
                      </>
                    )}
                  </button>
                  {consultCooldownSeconds > 0 && (
                    <p className="text-xs font-semibold text-brand-red text-center">
                      Please wait {consultCooldownLabel} before submitting
                      again.
                    </p>
                  )}
                  <p className="text-[10px] text-brand-dark/30 text-center uppercase tracking-widest">
                    {t("interestForm.confidentialNote")}
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
