"use client";

import { useState } from "react";
import Link from "@/components/link";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Send,
  CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface QuestionItem {
  q: string;
  a: string;
}

interface FaqCategoryItem {
  category: string;
  icon: string;
  questions: QuestionItem[];
}

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-200 last:border-0">
      <button
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-stone-800 group-hover:text-red-700 transition-colors leading-snug">
          {q}
        </span>
        <span className="mt-0.5 shrink-0 text-stone-400 group-hover:text-red-600 transition-colors">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open && (
        <div className="pb-5 pr-8 text-stone-600 leading-relaxed text-sm">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const t = useTranslations("FAQ");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Directly call the fully typed raw configuration arrays from active dictionary files
  const faqCategories: FaqCategoryItem[] = t.raw("faqCategories");

  const filtered = activeCategory
    ? faqCategories.filter((c) => c.category === activeCategory)
    : faqCategories;

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans">
      {/* Hero */}
      <div className="bg-[#1A1A1A] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-red-700 text-white text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            {t("hero.badge")}
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            {t("hero.title")}
          </h1>
          <p className="text-stone-400 text-lg leading-relaxed">
            {t("hero.description")}
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b border-stone-100 sticky top-16 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === null
                ? "bg-red-700 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {t("allTopics")}
          </button>
          {faqCategories.map((c) => (
            <button
              key={c.category}
              onClick={() =>
                setActiveCategory(
                  activeCategory === c.category ? null : c.category,
                )
              }
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === c.category
                  ? "bg-red-700 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {c.icon} {c.category}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
        {filtered.map((cat) => (
          <div key={cat.category}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{cat.icon}</span>
              <h2 className="font-serif text-2xl font-bold text-stone-900">
                {cat.category}
              </h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-6">
              {cat.questions.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Submit a Question form */}
      <SubmitQuestionForm />

      {/* Still need help CTA */}
      <div className="bg-[#1A1A1A] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold mb-4">
            {t("stillHelp.title")}
          </h2>
          <p className="text-stone-400 mb-8 leading-relaxed">
            {t("stillHelp.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:0416036016"
              className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              <Phone size={16} />
              0416 036 016
            </a>
            <a
              href="mailto:info@saigonexpress.com.au"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              <Mail size={16} />
              info@saigonexpress.com.au
            </a>
            <Link href="/stores">
              <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-full transition-colors">
                <MapPin size={16} />
                {t("stillHelp.btnFindStore")}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitQuestionForm() {
  const t = useTranslations("FAQ");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const submitMutation = trpc.public.submitFaqQuestion.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setName("");
      setEmail("");
      setQuestion("");
      setFormError("");
    },
    onError: (err: { message?: string }) => {
      setFormError(err.message || t("errors.fallback"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 10) {
      setFormError(t("errors.length"));
      return;
    }
    setFormError("");
    submitMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      question: question.trim(),
    });
  };

  return (
    <div className="bg-stone-50 py-16 px-4 border-t border-stone-200">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
            <MessageCircle className="text-red-700" size={22} />
          </div>
          <h2 className="font-serif text-3xl font-bold text-stone-900 mb-3">
            {t("form.title")}
          </h2>
          <p className="text-stone-500 leading-relaxed">{t("form.subtitle")}</p>
        </div>

        {submitted ? (
          <div className="bg-white border border-green-200 rounded-2xl p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-green-600 mb-3" size={40} />
            <h3 className="font-semibold text-xl text-stone-900 mb-2">
              {t("form.successTitle")}
            </h3>
            <p className="text-stone-500 mb-6">{t("form.successText")}</p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-red-700 font-semibold hover:underline text-sm"
            >
              {t("form.btnAnother")}
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                  {t("form.labelName")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={128}
                  placeholder={t("form.placeholderName")}
                  className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                  {t("form.labelEmail")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={320}
                  placeholder={t("form.placeholderEmail")}
                  className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                {t("form.labelQuestion")}
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                minLength={10}
                maxLength={1000}
                rows={4}
                placeholder={t("form.placeholderQuestion")}
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none bg-white"
              />
              <p className="text-xs text-stone-400 mt-1 text-right">
                {question.length}/1000
              </p>
            </div>
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={
                submitMutation.isPending || !name.trim() || !question.trim()
              }
              className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
            >
              {submitMutation.isPending ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Send size={15} />
              )}
              {submitMutation.isPending
                ? t("form.btnSending")
                : t("form.btnSubmit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
