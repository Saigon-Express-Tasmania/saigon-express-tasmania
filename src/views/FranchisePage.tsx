"use client";

import AppImage from "@/components/AppImage";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
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

// Lucide icon dictionary mapping for programmatic icon rendering
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

export default function FranchisePage() {
  const t = useTranslations("Franchise");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    investmentBudget: "",
    hasExperience: "no",
    message: "",
  });

  // Consultation modal state
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

  // Pull array properties cleanly from the active JSON translation file
  const investmentStrip: StripItem[] = t.raw("investmentStrip");
  const aboutChecklist: string[] = t.raw("about.checklist");
  const formatsList: FormatItem[] = t.raw("formats.items");
  const processSteps: StepItem[] = t.raw("process.steps");

  // Transform the abstract dynamic benefits configuration index
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

  const submitApplication = trpc.public.submitFranchiseApplication.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error(t("toasts.error")),
  });

  const bookConsultation = trpc.franchise.bookConsultation.useMutation({
    onSuccess: () => setConsultSubmitted(true),
    onError: () => toast.error(t("toasts.error")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) {
      toast.error(t("toasts.requiredMain"));
      return;
    }
    submitApplication.mutate({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || undefined,
      city: form.city || undefined,
      state: "Tasmania",
      investmentBudget: form.investmentBudget || undefined,
      businessExperience:
        form.hasExperience === "yes"
          ? t("interestForm.experiencePayloadYes")
          : t("interestForm.experiencePayloadNo"),
      message: form.message || undefined,
    });
  };

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultForm.name || !consultForm.email || !consultForm.phone) {
      toast.error(t("toasts.requiredConsult"));
      return;
    }
    bookConsultation.mutate({
      name: consultForm.name,
      email: consultForm.email,
      phone: consultForm.phone,
      preferredDate: consultForm.preferredDate || undefined,
      preferredTime: consultForm.preferredTime || undefined,
      message: consultForm.message || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Hero */}
      <section className="relative aspect-3/1 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/manus-storage/franchise__hero.jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 h-full flex flex-col items-start justify-center px-6 md:px-20 max-w-[1280px] mx-auto">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-4">
            {t("hero.badge")}
          </p>
          <h1 className="font-serif text-white text-5xl md:text-7xl leading-tight max-w-3xl mb-6">
            {t("hero.titleLine1")}
            <br />
            {t("hero.titleLine2")}
          </h1>
          <p className="text-white/65 text-lg max-w-xl leading-relaxed mb-8">
            {t("hero.description")}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#franchise-form"
              className="bg-brand-red text-white px-6 py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors inline-flex items-center gap-2"
            >
              {t("hero.ctaInterest")} <ChevronRight size={15} />
            </a>
            <a
              href="#models"
              className="border border-white text-white px-6 py-3 font-semibold text-sm hover:bg-white hover:text-brand-dark transition-colors"
            >
              {t("hero.ctaModels")}
            </a>
          </div>
        </div>
      </section>

      {/* Investment summary strip */}
      <section className="bg-brand-red text-white py-10">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {investmentStrip.map((s, i) => (
            <div key={i}>
              <div className="font-serif text-4xl font-bold mb-1">{s.num}</div>
              <div className="text-white/65 text-xs font-medium uppercase tracking-wider leading-tight">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About the opportunity */}
      <section className="bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2">
          <div className="relative h-72 lg:h-auto overflow-hidden min-h-[400px]">
            <AppImage
              src="/manus-storage/IMG_43782_5753892a.jpg"
              alt="Saigon Express opens new store in Hobart CBD — Pulse Tasmania"
              fill
              className="object-cover"
            />
          </div>
          <div className="p-10 lg:p-16 flex flex-col justify-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-4">
              {t("about.label")}
            </p>
            <h2 className="font-serif text-brand-dark text-4xl mb-5">
              {t("about.titleLine1")}
              <br />
              {t("about.titleLine2")}
            </h2>
            <p className="text-brand-dark/60 text-sm leading-relaxed mb-4">
              {t("about.desc1")}
            </p>
            <p className="text-brand-dark/60 text-sm leading-relaxed mb-6">
              {t("about.desc2")}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {aboutChecklist.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-brand-dark/70"
                >
                  <CheckCircle
                    size={13}
                    className="text-brand-red flex-shrink-0"
                  />{" "}
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-brand-cream text-xs text-brand-dark/50 leading-relaxed">
              <strong className="text-brand-dark/70">
                {t("about.legalLabel")}
              </strong>{" "}
              {t("about.legalValue")}
              <br />
              <strong className="text-brand-dark/70">
                {t("about.addressLabel")}
              </strong>{" "}
              {t("about.addressValue")}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">
              {t("benefits.label")}
            </p>
            <h2 className="font-serif text-brand-dark text-4xl">
              {t("benefits.titleLine1")}
              <br />
              {t("benefits.titleLine2")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefitsList.map((b, i) => {
              const TargetIcon = ICON_MAP[b.icon] || Award;
              return (
                <div
                  key={i}
                  className="bg-white p-6 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="w-10 h-10 bg-brand-red flex items-center justify-center mb-4">
                    <TargetIcon size={18} className="text-white" />
                  </div>
                  <div className="font-serif text-brand-dark text-lg mb-2">
                    {b.title}
                  </div>
                  <div className="text-brand-dark/55 text-sm leading-relaxed">
                    {b.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Franchise formats */}
      <section id="models" className="py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">
              {t("formats.label")}
            </p>
            <h2 className="font-serif text-brand-dark text-4xl">
              {t("formats.title")}
            </h2>
            <p className="text-brand-dark/55 mt-3 text-sm max-w-xl mx-auto">
              {t("formats.description")}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {formatsList.map((m, i) => (
              <div
                key={i}
                className={`p-8 ${i === 0 ? "bg-brand-red text-white" : "bg-brand-cream"}`}
              >
                <div className="text-4xl mb-4">{m.icon}</div>
                <h3
                  className={`font-serif text-2xl mb-3 ${i === 0 ? "text-white" : "text-brand-dark"}`}
                >
                  {m.name}
                </h3>
                <p
                  className={`text-sm leading-relaxed mb-4 ${i === 0 ? "text-white/75" : "text-brand-dark/60"}`}
                >
                  {m.desc}
                </p>
                <div
                  className={`text-xs font-bold uppercase tracking-wider ${i === 0 ? "text-white/60" : "text-brand-dark/40"}`}
                >
                  {t("formats.investmentLabel")}
                </div>
                <div
                  className={`font-serif text-xl font-bold mt-1 ${i === 0 ? "text-white" : "text-brand-dark"}`}
                >
                  {m.investment}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-brand-dark/40 text-xs mt-6">
            {t("formats.investmentNote")}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-brand-dark">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-3">
              {t("process.label")}
            </p>
            <h2 className="font-serif text-white text-4xl">
              {t("process.title")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {processSteps.map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-6">
                <div className="text-brand-amber font-bold text-sm font-mono mb-3">
                  {s.num}
                </div>
                <h3 className="font-serif text-white text-lg mb-2">
                  {s.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free consultation banner */}
      <section
        className="relative py-20 px-6 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 65% 50%, #b91c1c 0%, #7f1d1d 55%, #450a0a 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold tracking-widest uppercase px-5 py-2 rounded-full mb-6 border border-white/20">
            <Calendar size={13} />
            {t("consultBanner.badge")}
          </div>
          <h2 className="font-serif text-white text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {t("consultBanner.title")}
          </h2>
          <p className="text-white/75 text-base md:text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            {t("consultBanner.description")}
          </p>
          <button
            onClick={() => setConsultModalOpen(true)}
            className="inline-flex items-center gap-3 bg-white text-brand-red font-bold text-base px-10 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-200"
          >
            <MessageCircle size={20} />
            {t("consultBanner.btnBook")}
          </button>
        </div>
      </section>

      {/* Application interest form */}
      <section id="franchise-form" className="py-16 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">
                {t("interestForm.label")}
              </p>
              <h2 className="font-serif text-brand-dark text-4xl mb-4">
                {t("interestForm.title")}
              </h2>
              <p className="text-brand-dark/55 leading-relaxed mb-6 text-sm">
                {t("interestForm.description")}
              </p>
              <div className="space-y-3 text-sm text-brand-dark/60">
                {interestCheckpoints.map((cp, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle size={15} className="text-brand-red" /> {cp}
                  </div>
                ))}
              </div>
              <div className="mt-8 p-5 bg-white border-l-4 border-brand-red">
                <p className="font-semibold text-brand-dark text-sm mb-2">
                  {t("interestForm.asideTitle")}
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
                <div className="flex items-center gap-2 text-sm text-brand-dark/70 mb-1">
                  <MapPin size={13} className="text-brand-red" />
                  <span>Level 2, 86 Collins St, Hobart TAS 7000</span>
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
                    {t("interestForm.successTitle")}
                  </h3>
                  <p className="text-brand-dark/55 text-sm">
                    {t("interestForm.successText")}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("interestForm.inputName")}
                      </label>
                      <input
                        type="text"
                        required
                        value={form.fullName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, fullName: e.target.value }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("interestForm.inputEmail")}
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, email: e.target.value }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("interestForm.inputPhone")}
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        {t("interestForm.inputLocation")}
                      </label>
                      <input
                        type="text"
                        placeholder={t("interestForm.placeholderLocation")}
                        value={form.city}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, city: e.target.value }))
                        }
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
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
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
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
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
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
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
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
                  <div>
                    <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                      {t("interestForm.inputAbout")}
                    </label>
                    <textarea
                      rows={4}
                      value={form.message}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, message: e.target.value }))
                      }
                      placeholder={t("interestForm.placeholderAbout")}
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors resize-none bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitApplication.isPending}
                    className="w-full bg-brand-red text-white py-4 font-semibold text-sm hover:bg-brand-red/90 transition-colors disabled:opacity-50"
                  >
                    {submitApplication.isPending
                      ? t("interestForm.btnSubmitting")
                      : t("interestForm.btnSubmit")}
                  </button>
                  <p className="text-xs text-brand-dark/35 text-center">
                    {t("interestForm.confidentialNote")}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Consultation Booking Modal overlay */}
      {consultModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setConsultModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-serif text-xl font-bold text-brand-dark">
                  {t("consultModal.title")}
                </h3>
                <p className="text-sm text-brand-dark/50 mt-0.5">
                  {t("consultModal.subtitle")}
                </p>
              </div>
              <button
                onClick={() => setConsultModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-brand-dark/50" />
              </button>
            </div>

            {/* Modal body */}
            {consultSubmitted ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle
                  size={48}
                  className="text-green-500 mx-auto mb-4"
                />
                <h4 className="font-serif text-xl font-bold text-brand-dark mb-2">
                  {t("consultModal.successTitle")}
                </h4>
                <p className="text-brand-dark/60 text-sm">
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
                  className="mt-6 bg-brand-red text-white px-8 py-3 rounded-full font-semibold text-sm hover:bg-brand-red/90 transition-colors"
                >
                  {t("consultModal.btnClose")}
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleConsultSubmit}
                className="px-6 py-6 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">
                      {t("consultModal.inputName")}
                    </label>
                    <input
                      required
                      value={consultForm.name}
                      onChange={(e) =>
                        setConsultForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-white"
                      placeholder={t("consultModal.placeholderName")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">
                      {t("consultModal.inputPhone")}
                    </label>
                    <input
                      required
                      value={consultForm.phone}
                      onChange={(e) =>
                        setConsultForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-white"
                      placeholder={t("consultModal.placeholderPhone")}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">
                    {t("consultModal.inputEmail")}
                  </label>
                  <input
                    required
                    type="email"
                    value={consultForm.email}
                    onChange={(e) =>
                      setConsultForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-white"
                    placeholder={t("consultModal.placeholderEmail")}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">
                      {t("consultModal.inputDate")}
                    </label>
                    <input
                      type="date"
                      value={consultForm.preferredDate}
                      onChange={(e) =>
                        setConsultForm((f) => ({
                          ...f,
                          preferredDate: e.target.value,
                        }))
                      }
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">
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
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-white"
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
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">
                    {t("consultModal.inputMessage")}
                  </label>
                  <textarea
                    rows={3}
                    value={consultForm.message}
                    onChange={(e) =>
                      setConsultForm((f) => ({ ...f, message: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red resize-none bg-white"
                    placeholder={t("consultModal.placeholderMessage")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={bookConsultation.isPending}
                  className="w-full bg-brand-red text-white py-3.5 rounded-full font-bold text-sm hover:bg-brand-red/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {bookConsultation.isPending ? (
                    t("consultModal.btnSubmitting")
                  ) : (
                    <>
                      <MessageCircle size={16} /> {t("consultModal.btnSubmit")}
                    </>
                  )}
                </button>
                <p className="text-xs text-brand-dark/35 text-center">
                  {t("interestForm.confidentialNote")}
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
