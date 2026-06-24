"use client";

import AppImage from "@/components/AppImage";
import { useState, useRef } from "react";
import Link from "@/components/link";
import { useTranslations } from "next-intl";
import {
  ChevronRight,
  MapPin,
  Users,
  Heart,
  Star,
  Award,
  Leaf,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";

/* ─── Static image/color data (non-translatable) ────────────────────────── */

const TIMELINE_STATIC = [
  {
    image: "/manus-storage/news-story-began_47dbdf79.jpg",
    color: "bg-red-600",
  },
  {
    image: "/manus-storage/saigon_lounge_storefront_2019_3f67e7dd.jpg",
    color: "bg-orange-600",
  },
  {
    image: "/manus-storage/store_kingston_391b29d4.jpg",
    color: "bg-amber-600",
  },
  {
    image: "/manus-storage/store_glebehill_c588aacd.png",
    color: "bg-green-700",
  },
  {
    image: "/manus-storage/store_cbd_3e998602.jpg",
    color: "bg-blue-700",
  },
  {
    image: "/manus-storage/store_sorell_621de518.jpg",
    color: "bg-purple-700",
  },
];

const DISH_IMAGES = [
  "/manus-storage/saigo_express__Combination_beef_noodle_soup_pho_NativeLarge_30ae4434.png",
  "/manus-storage/saigo_express__Vietnamese_Roasted_pork_baguette_Native_81be063f.jpg",
  "/manus-storage/saigo_express__Cuon_Vietnamese_prawn_rice_paper_rolls_NativeLarge_d710816c.png",
  "/manus-storage/saigo_express__Vietnamese_rice_noodle_salad_bun_NativeLarge_724e0124.png",
];

const VALUE_ICONS = [Leaf, Heart, Users, Star, Award, MapPin];

/* ─── Interactive Timeline Component ────────────────────────────────────── */

function InteractiveTimeline() {
  const t = useTranslations("OurStory.timeline");
  const [activeIdx, setActiveIdx] = useState(0);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const timelineItems = t.raw("items") as Array<{
    year: string;
    title: string;
    location: string;
    highlight: string;
    description: string;
    detail: string;
    stat: { value: string; label: string };
  }>;

  const activeItem = timelineItems[activeIdx];
  const activeStatic = TIMELINE_STATIC[activeIdx];

  const handleSelect = (idx: number) => {
    setActiveIdx(idx);
    setExpandedIdx(null);
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    }
  };

  const toggleExpand = (idx: number) => {
    setExpandedIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Year selector bar ── */}
      <div className="flex items-center justify-center gap-0 mb-12 overflow-x-auto pb-2">
        {timelineItems.map((item, i) => (
          <button
            key={item.year}
            onClick={() => handleSelect(i)}
            className={`relative flex flex-col items-center group transition-all duration-300 px-4 md:px-6 ${
              i === activeIdx ? "scale-100" : "opacity-60 hover:opacity-100"
            }`}
          >
            {/* Connector line */}
            {i < timelineItems.length - 1 && (
              <div
                className={`absolute top-5 left-1/2 w-full h-0.5 transition-colors duration-500 ${
                  i < activeIdx ? "bg-red-600" : "bg-gray-200"
                }`}
              />
            )}
            {/* Dot */}
            <div
              className={`relative z-10 size-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-md ${
                i === activeIdx
                  ? "bg-red-600 text-white ring-4 ring-red-100"
                  : i < activeIdx
                    ? "bg-red-600 text-white"
                    : "bg-white text-gray-500 border-2 border-gray-200 group-hover:border-red-300"
              }`}
            >
              {i < activeIdx ? (
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            {/* Year label */}
            <span
              className={`mt-2 text-xs font-bold whitespace-nowrap transition-colors duration-300 ${
                i === activeIdx
                  ? "text-red-600"
                  : "text-gray-400 group-hover:text-gray-700"
              }`}
            >
              {item.year}
            </span>
          </button>
        ))}
      </div>

      {/* ── Main spotlight panel ── */}
      <div
        ref={detailRef}
        className="grid lg:grid-cols-5 gap-0 rounded-3xl overflow-hidden shadow-2xl border border-gray-100 scroll-mt-24"
      >
        {/* Image side */}
        <div className="lg:col-span-2 relative overflow-hidden min-h-[280px] lg:min-h-[480px]">
          {timelineItems.map((item, i) => (
            <div
              key={item.year}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === activeIdx ? "opacity-100" : "opacity-0"
              }`}
            >
              <AppImage
                src={TIMELINE_STATIC[i].image}
                alt={item.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {/* Stat badge */}
              <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {item.stat.value}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {item.stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content side */}
        <div className="lg:col-span-3 bg-white p-8 lg:p-12 flex flex-col justify-between">
          <div>
            {/* Year + highlight */}
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-block bg-red-600 text-white text-sm font-bold px-4 py-1.5 rounded-full">
                {activeItem.year}
              </span>
              <span className="text-xs font-semibold text-red-500 uppercase tracking-widest">
                {activeItem.highlight}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">
              {activeItem.title}
            </h3>

            {/* Location */}
            <p className="text-sm text-red-600 font-medium flex items-center gap-1.5 mb-5">
              <MapPin size={14} /> {activeItem.location}
            </p>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed mb-4">
              {activeItem.description}
            </p>

            {/* Expandable deeper detail */}
            <div
              className={`overflow-hidden transition-all duration-500 ${
                expandedIdx === activeIdx
                  ? "max-h-96 opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <p className="text-gray-500 leading-relaxed text-sm pt-2 pb-4 border-t border-gray-100">
                {activeItem.detail}
              </p>
            </div>

            <button
              onClick={() => toggleExpand(activeIdx)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors mt-1"
            >
              {expandedIdx === activeIdx ? (
                <>
                  <ChevronUp size={16} /> {t("showLess")}
                </>
              ) : (
                <>
                  <ChevronDown size={16} /> {t("readMore")}
                </>
              )}
            </button>
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => handleSelect(Math.max(0, activeIdx - 1))}
              disabled={activeIdx === 0}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight size={16} className="rotate-180" />
              {activeIdx > 0 ? timelineItems[activeIdx - 1].year : ""}
            </button>

            {/* Dot indicators */}
            <div className="flex gap-2">
              {timelineItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === activeIdx
                      ? "bg-red-600 w-6"
                      : "bg-gray-200 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() =>
                handleSelect(Math.min(timelineItems.length - 1, activeIdx + 1))
              }
              disabled={activeIdx === timelineItems.length - 1}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {activeIdx < timelineItems.length - 1
                ? timelineItems[activeIdx + 1].year
                : ""}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mini milestone cards (all milestones at a glance) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
        {timelineItems.map((item, i) => (
          <button
            key={item.year}
            onClick={() => handleSelect(i)}
            className={`group relative rounded-2xl overflow-hidden aspect-[3/4] text-left transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 ${
              i === activeIdx ? "ring-2 ring-red-600 ring-offset-2" : ""
            }`}
          >
            <AppImage
              src={TIMELINE_STATIC[i].image}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div
                className={`inline-block text-xs font-bold text-white px-2 py-0.5 rounded-full mb-1 ${TIMELINE_STATIC[i].color}`}
              >
                {item.year}
              </div>
              <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
                {item.title}
              </p>
            </div>
            {i === activeIdx && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function OurStory() {
  const t = useTranslations("OurStory");

  const dishes = t.raw("food.dishes") as Array<{
    name: string;
    description: string;
  }>;
  const values = t.raw("values.items") as Array<{
    title: string;
    description: string;
  }>;
  const stats = t.raw("anniversary.stats") as Array<{
    value: string;
    label: string;
  }>;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ── */}
      <section className="relative h-[62vh] min-h-[440px] flex items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/manus-storage/saigo_express__hero_Native_5d9afb69.jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

        <div className="relative z-10 container pb-16">
          <div className="max-w-2xl bg-black/40 backdrop-blur-[2px] p-6 md:p-8 rounded-2xl border border-white/10 shadow-xl">
            <span className="inline-block text-sm md:text-base font-bold tracking-widest text-red-400 uppercase mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {t("hero.eyebrow")}
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 whitespace-pre-line drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
              {t("hero.heading")}
            </h1>

            <p className="text-white text-lg md:text-xl font-medium max-w-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {t("hero.subheading")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Founder Intro ── */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
            <div>
              <span className="inline-block text-xs font-semibold tracking-widest text-red-600 uppercase mb-4">
                {t("founder.eyebrow")}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {t("founder.heading")}
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                {t("founder.paragraph1")}
              </p>
              <p className="text-gray-700 text-xl font-medium italic leading-relaxed mb-5 border-l-4 border-red-500 pl-5">
                {t("founder.quote")}
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                {t("founder.paragraph2")}
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                {t("founder.paragraph3")}
              </p>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
                <AppImage
                  src="/manus-storage/dr_tien_ho_portrait_4d605389.jpg"
                  alt={t("founder.heading")}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-red-600 text-white rounded-xl p-5 shadow-xl">
                <div className="text-3xl font-bold">
                  {t("founder.badge.years")}
                </div>
                <div className="text-sm font-medium text-red-100">
                  {t("founder.badge.yearsLabel")}
                </div>
              </div>
              <div className="absolute -top-6 -right-6 bg-white rounded-xl p-5 shadow-xl border border-gray-100">
                <div className="text-3xl font-bold text-gray-900">
                  {t("founder.badge.locations")}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {t("founder.badge.locationsLabel")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Timeline ── */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold tracking-widest text-red-600 uppercase mb-3">
              {t("timeline.eyebrow")}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("timeline.heading")}
            </h2>
            <p className="text-gray-500 text-lg">{t("timeline.subheading")}</p>
          </div>
          <InteractiveTimeline />
        </div>
      </section>

      {/* ── Vietnamese Food Culture ── */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold tracking-widest text-red-600 uppercase mb-3">
              {t("food.eyebrow")}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("food.heading")}
            </h2>
            <p className="text-gray-500 text-lg">{t("food.subheading")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-14">
            {dishes.map((dish, i) => (
              <Link
                key={dish.name}
                className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                href="/menu"
              >
                <div className="relative aspect-video overflow-hidden">
                  <AppImage
                    src={DISH_IMAGES[i]}
                    alt={dish.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {dish.name}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {dish.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="max-w-3xl mx-auto bg-red-600 rounded-2xl p-10 text-center text-white">
            <p className="text-xl md:text-2xl font-medium leading-relaxed italic mb-6">
              {t("food.pressQuote")}
            </p>
            <p className="text-red-200 text-sm font-semibold uppercase tracking-widest mb-6">
              {t("food.pressAttribution")}
            </p>
            <p className="text-red-100 text-base leading-relaxed">
              {t("food.pressBody")}
            </p>
          </div>
        </div>
      </section>

      {/* ── 10-Year Anniversary Banner ── */}
      <section className="py-16 bg-brand-dark text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block text-xs font-bold tracking-widest text-brand-amber uppercase mb-4">
              {t("anniversary.eyebrow")}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("anniversary.heading")}
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
              {t("anniversary.body")} <em>{t("anniversary.quote")}</em>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-5">
                  <div className="text-3xl font-bold text-brand-amber">
                    {s.value}
                  </div>
                  <div className="text-sm text-white/60 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Community ── */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden aspect-square shadow-md">
                <AppImage
                  src="/manus-storage/saigo_express__Vietnamese_Roasted_pork_baguette_Native_81be063f.jpg"
                  alt="Bánh mì"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-square shadow-md">
                <AppImage
                  src="/manus-storage/saigo_express__Cuon_Vietnamese_prawn_rice_paper_rolls_NativeLarge_d710816c.png"
                  alt="Rice paper rolls"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-square shadow-md col-span-2">
                <AppImage
                  src="/manus-storage/_Q7A0084addedcontrastandsat_4c8d6b63.jpg"
                  alt="Community"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div>
              <span className="inline-block text-xs font-semibold tracking-widest text-red-600 uppercase mb-4">
                {t("community.eyebrow")}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {t("community.heading")}
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                {t("community.paragraph1")}
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                {t("community.paragraph2")}
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                {t("community.paragraph3")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission Statement ── */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block text-xs font-semibold tracking-widest text-red-600 uppercase mb-4">
              {t("mission.eyebrow")}
            </span>
            <blockquote className="text-2xl md:text-3xl font-serif text-gray-900 leading-relaxed mb-6 italic">
              {t("mission.quote")}
            </blockquote>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-xs! font-semibold text-gray-700">
              <div className="flex items-center gap-2 bg-red-50 px-5 py-3 rounded-full">
                {t("mission.pill1")}
              </div>
              <div className="flex items-center gap-2 bg-red-50 px-5 py-3 rounded-full">
                {t("mission.pill2")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold tracking-widest text-red-600 uppercase mb-3">
              {t("values.eyebrow")}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("values.heading")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {values.map((v, i) => {
              const Icon = VALUE_ICONS[i];
              return (
                <div
                  key={v.title}
                  className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-red-200 hover:bg-red-50/30 transition-colors group"
                >
                  <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center mb-4 group-hover:bg-red-600 transition-colors">
                    <Icon
                      size={20}
                      className="text-red-600 group-hover:text-white transition-colors"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {v.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {v.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-red-600 text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("cta.heading")}
          </h2>
          <p className="text-red-100 text-lg max-w-xl mx-auto mb-8">
            {t("cta.subheading")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/stores"
              className="inline-flex items-center gap-2 bg-white text-red-600 font-semibold px-7 py-3 rounded-full hover:bg-red-50 transition-colors"
            >
              {t("cta.findStore")} <ChevronRight size={16} />
            </Link>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-semibold px-7 py-3 rounded-full hover:border-white hover:bg-white/10 transition-colors"
            >
              {t("cta.viewMenu")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
