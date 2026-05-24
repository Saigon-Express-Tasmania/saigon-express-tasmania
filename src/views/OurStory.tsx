"use client";

import AppImage from "@/components/AppImage";
import { useState, useRef, useEffect } from "react";
import Link from "@/components/link";
import { ChevronRight, MapPin, Users, Heart, Star, Award, Leaf, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

/* ─── Data ──────────────────────────────────────────────────────────────── */

const TIMELINE = [
  {
    year: "2016",
    title: "Where It All Began",
    location: "North Hobart — 335 Elizabeth Street",
    highlight: "2 staff · First store · June 2016",
    description:
      "Dr. Tien Ho opened the very first Saigon Express in June 2016 with just two staff and a single-minded passion: to bring genuine Vietnamese street food to Tasmania. Inspired by his mother's home cooking recipes, he set out to bring those authentic flavours — fresh, healthy, and Vietnamese — to every Tasmanian table.",
    detail:
      "Starting from a modest shopfront at 335 Elizabeth Street, Dr. Tien Ho invested everything into a dream that many considered a long shot. Tasmania had virtually no Vietnamese restaurant scene at the time. Within months, word spread — the pho was the real thing, the banh mi were freshly baked, and the welcome was genuine. The tagline said it all: 'Fresh, healthy, Vietnamese — from mum's cooking recipe to your table.' That first store became the foundation of everything that followed.",
    image: "/manus-storage/news-story-began_47dbdf79.jpg",
    stat: { value: "2", label: "Staff at opening" },
    color: "bg-red-600",
  },
  {
    year: "2019",
    title: "The Lounge & Bar Arrives",
    location: "North Hobart — 329 Elizabeth Street",
    highlight: "Dine-in · Cocktail bar",
    description:
      "Four years after the original store proved there was a real appetite for Vietnamese food in Hobart, Dr. Tien Ho opened the O-Grill Restaurant Lounge & Bar just doors away. The new venue brought a relaxed dine-in experience, a cocktail bar, and an expanded menu — including the now-famous Kumquat Mojito.",
    detail:
      "The O-Grill Lounge & Bar at 329 Elizabeth Street transformed the Saigon Express experience from a quick-service takeaway into a destination. Guests could now linger over cocktails, share platters, and enjoy the full breadth of Vietnamese cuisine in a warm, contemporary setting. North Hobart became the undisputed heartbeat of the brand.",
    image: "/manus-storage/saigon_lounge_storefront_2019_3f67e7dd.jpg",
    stat: { value: "2", label: "North Hobart venues" },
    color: "bg-orange-600",
  },
  {
    year: "2021",
    title: "Heading South",
    location: "Kingston Plaza — Channel Highway",
    highlight: "Southern suburbs · 3rd location",
    description:
      "Kingston became the third location, bringing Dr. Tien Ho's vision of accessible Vietnamese street food to Hobart's southern suburbs. The Kingston Plaza store introduced the brand to a new community of families and professionals, and proved that the appetite for fresh, affordable Vietnamese food extended well beyond the inner city.",
    detail:
      "Kingston Plaza was a deliberate move to test the brand's appeal beyond its North Hobart heartland. The response exceeded expectations — families, office workers, and students from the Channel Highway corridor embraced the menu enthusiastically. It confirmed that Saigon Express had outgrown its suburb and was ready to become a truly island-wide brand.",
    image: "/manus-storage/store_kingston_391b29d4.jpg",
    stat: { value: "3", label: "Locations" },
    color: "bg-amber-600",
  },
  {
    year: "2022",
    title: "Crossing to the Eastern Shore",
    location: "Glebe Hill Village — Howrah",
    highlight: "20+ staff · Eastern shore",
    description:
      "The Glebe Hill Village restaurant soft-opened in November 2022, bringing Saigon Express to Hobart's eastern shore for the first time. The team had now grown to over twenty staff, and the brand's reputation for fresh, consistent Vietnamese food was firmly established across the greater Hobart area.",
    detail:
      "Howrah marked a significant geographic milestone — for the first time, Saigon Express was serving customers on both sides of the Derwent River. The Glebe Hill Village location was designed with a larger dining room and an expanded dine-in menu, reflecting the brand's growing confidence and operational maturity.",
    image: "/manus-storage/store_glebehill_c588aacd.png",
    stat: { value: "20+", label: "Team members" },
    color: "bg-green-700",
  },
  {
    year: "2024",
    title: "Into the Heart of the City",
    location: "Hobart CBD — 95 Liverpool Street",
    highlight: "250+ dishes · City centre",
    description:
      "December 2024 marked a milestone: Saigon Express opened its sleekest venue yet in the Hobart city centre. With over 250 dishes on the menu — from banh mi and pho to bao buns, fried chicken burgers, and rice paper rolls — the CBD store brought Vietnamese flavours to the doorstep of Hobart's office workers, students, and visitors.",
    detail:
      "The CBD store at 95 Liverpool Street was the brand's most ambitious project to date — a high-footfall city-centre venue designed to serve the lunchtime crowd, evening diners, and weekend visitors alike. The menu was expanded to over 250 items, and the interior design reflected a more contemporary, urban aesthetic while honouring the brand's Vietnamese roots.",
    image: "/manus-storage/store_cbd_3e998602.jpg",
    stat: { value: "250+", label: "Menu items" },
    color: "bg-blue-700",
  },
  {
    year: "2025",
    title: "Reaching Every Corner of Tasmania",
    location: "Sorell — Gateway Shopping Centre & Gordon Street",
    highlight: "Award-winning · 8+ locations",
    description:
      "The brand's reach extended to Sorell in 2025, with two new locations serving the Derwent Valley and Coal River Valley communities. Saigon Express was recognised as the Best Vietnamese Restaurant in Sorell Council by Quality Business Awards, achieving a quality score above 95%.",
    detail:
      "Sorell represented the brand's first foray beyond greater Hobart, signalling a genuine commitment to making Vietnamese food accessible to all Tasmanians regardless of where they live. The Quality Business Awards recognition — with a quality score above 95% — validated the brand's consistent standards across all locations. Sandy Bay was also announced as the next suburb to welcome Saigon Express.",
    image: "/manus-storage/store_sorell_621de518.jpg",
    stat: { value: "8+", label: "Locations" },
    color: "bg-purple-700",
  },
];

const VALUES = [
  { icon: Leaf,  title: "Fresh Every Day",        description: "Every dish is prepared from scratch each morning. No frozen shortcuts — just ingredients sourced fresh and cooked to order." },
  { icon: Heart, title: "Rooted in Culture",       description: "Our recipes carry the flavours of Vietnamese home kitchens and street stalls. From slow-simmered pho broth to hand-rolled rice paper rolls, every dish tells a story." },
  { icon: Users, title: "Community First",         description: "We host Mid-Autumn Festival celebrations, Lunar New Year dinners, and community events because food is the most powerful bridge between cultures." },
  { icon: Star,  title: "Accessible Authenticity", description: "Vietnamese food should be for everyone. We balance the 'essence of home' for Vietnamese diners with a welcoming experience for all Tasmanians." },
  { icon: Award, title: "Entrepreneurial Spirit",  description: "From two staff in a North Hobart kitchen to eight locations across the island — our growth is proof that passion and community trust build something lasting." },
  { icon: MapPin, title: "Proudly Tasmanian",      description: "Tasmania's cool climate and close-knit communities remind many of our team of home. We are proud to be part of this island's food story." },
];

const DISHES = [
  { name: "Phở",                  description: "Vietnam's most iconic dish — a slow-simmered bone broth fragrant with star anise, cinnamon, and charred ginger, served with rice noodles and your choice of protein.", image: "/manus-storage/saigo_express__Combination_beef_noodle_soup_pho_NativeLarge_30ae4434.png" },
  { name: "Bánh Mì",              description: "A legacy of French colonial influence — a crisp baguette filled with Vietnamese-style meats, pickled daikon, fresh coriander, and chilli.", image: "/manus-storage/saigo_express__Vietnamese_Roasted_pork_baguette_Native_81be063f.jpg" },
  { name: "Cuốn (Rice Paper Rolls)", description: "Delicate rice paper wrapped around fresh herbs, vermicelli, and your choice of filling — a hands-on taste of Vietnamese tradition.", image: "/manus-storage/saigo_express__Cuon_Vietnamese_prawn_rice_paper_rolls_NativeLarge_d710816c.png" },
  { name: "Bún (Vermicelli Salad)", description: "Cool rice vermicelli topped with grilled meats, fresh herbs, crushed peanuts, and a tangy nước chấm dressing — light, vibrant, and deeply satisfying.", image: "/manus-storage/saigo_express__Vietnamese_rice_noodle_salad_bun_NativeLarge_724e0124.png" },
];

/* ─── Interactive Timeline Component ────────────────────────────────────── */

function InteractiveTimeline() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const activeItem = TIMELINE[activeIdx];

  // Auto-scroll to detail panel when a year is selected on mobile
  const handleSelect = (idx: number) => {
    setActiveIdx(idx);
    setExpandedIdx(null);
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  const toggleExpand = (idx: number) => {
    setExpandedIdx(prev => (prev === idx ? null : idx));
  };

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Year selector bar ── */}
      <div className="flex items-center justify-center gap-0 mb-12 overflow-x-auto pb-2">
        {TIMELINE.map((item, i) => (
          <button
            key={item.year}
            onClick={() => handleSelect(i)}
            className={`relative flex flex-col items-center group transition-all duration-300 px-4 md:px-6 ${
              i === activeIdx ? "scale-110" : "opacity-60 hover:opacity-100"
            }`}
          >
            {/* Connector line */}
            {i < TIMELINE.length - 1 && (
              <div className={`absolute top-5 left-1/2 w-full h-0.5 transition-colors duration-500 ${
                i < activeIdx ? "bg-red-600" : "bg-gray-200"
              }`} />
            )}
            {/* Dot */}
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-md ${
              i === activeIdx
                ? "bg-red-600 text-white ring-4 ring-red-100 scale-110"
                : i < activeIdx
                ? "bg-red-600 text-white"
                : "bg-white text-gray-500 border-2 border-gray-200 group-hover:border-red-300"
            }`}>
              {i < activeIdx ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            {/* Year label */}
            <span className={`mt-2 text-xs font-bold whitespace-nowrap transition-colors duration-300 ${
              i === activeIdx ? "text-red-600" : "text-gray-400 group-hover:text-gray-700"
            }`}>
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
          {TIMELINE.map((item, i) => (
            <div
              key={item.year}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === activeIdx ? "opacity-100" : "opacity-0"
              }`}
            >
              <AppImage
                src={item.image}
                alt={item.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {/* Stat badge */}
              <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg">
                <div className="text-2xl font-bold text-gray-900">{item.stat.value}</div>
                <div className="text-xs text-gray-500 font-medium">{item.stat.label}</div>
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
            <div className={`overflow-hidden transition-all duration-500 ${
              expandedIdx === activeIdx ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}>
              <p className="text-gray-500 leading-relaxed text-sm pt-2 pb-4 border-t border-gray-100">
                {activeItem.detail}
              </p>
            </div>

            <button
              onClick={() => toggleExpand(activeIdx)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors mt-1"
            >
              {expandedIdx === activeIdx ? (
                <><ChevronUp size={16} /> Show less</>
              ) : (
                <><ChevronDown size={16} /> Read the full story</>
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
              {activeIdx > 0 ? TIMELINE[activeIdx - 1].year : ""}
            </button>

            {/* Dot indicators */}
            <div className="flex gap-2">
              {TIMELINE.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === activeIdx ? "bg-red-600 w-6" : "bg-gray-200 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => handleSelect(Math.min(TIMELINE.length - 1, activeIdx + 1))}
              disabled={activeIdx === TIMELINE.length - 1}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {activeIdx < TIMELINE.length - 1 ? TIMELINE[activeIdx + 1].year : ""}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mini milestone cards (all milestones at a glance) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
        {TIMELINE.map((item, i) => (
          <button
            key={item.year}
            onClick={() => handleSelect(i)}
            className={`group relative rounded-2xl overflow-hidden aspect-[3/4] text-left transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 ${
              i === activeIdx ? "ring-2 ring-red-600 ring-offset-2" : ""
            }`}
          >
            <AppImage
              src={item.image}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className={`inline-block text-xs font-bold text-white px-2 py-0.5 rounded-full mb-1 ${item.color}`}>
                {item.year}
              </div>
              <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
                {item.title}
              </p>
            </div>
            {i === activeIdx && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <section className="relative h-[62vh] min-h-[440px] flex items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url('/manus-storage/saigo_express__hero_Native_5d9afb69.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
        <div className="relative z-10 container pb-16">
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-semibold tracking-widest text-red-400 uppercase mb-3">
              Our Story
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
              From Mum's Recipe<br />to Tasmania's Table
            </h1>
            <p className="text-white/80 text-lg max-w-xl">
              Authentic Vietnamese food, made fresh every day — bringing the real flavours of home to every corner of Tasmania.
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
                The Founder
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Dr. Tien Ho — Founder
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                Dr. Tien Ho came to Tasmania as a student and fell in love with the island. But one thing was missing — the food he grew up with. So in June 2016, he opened the first Saigon Express at 335 Elizabeth Street, North Hobart, on his own, with one simple idea:
              </p>
              <p className="text-gray-700 text-xl font-medium italic leading-relaxed mb-5 border-l-4 border-red-500 pl-5">
                "From mum's cooking recipe to every Tasmanian table."
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                Every dish is made fresh using quality Tasmanian produce — local vegetables, Tasmanian-grown herbs, and clean Tasmanian water. The food is honest, healthy, and true to the flavours he grew up eating at home in Vietnam.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Ten years on, Saigon Express has grown to eight locations across Tasmania. The mission has never changed — bring real Vietnamese food to the community, celebrate Vietnamese culture, and show what a Vietnamese-Australian business can achieve.
              </p>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
                <AppImage
                  src="/manus-storage/dr_tien_ho_portrait_4d605389.png"
                  alt="Dr. Tien Ho, Founder of Saigon Express Tasmania"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-red-600 text-white rounded-xl p-5 shadow-xl">
                <div className="text-3xl font-bold">10</div>
                <div className="text-sm font-medium text-red-100">Years · 2016–2026 🎉</div>
              </div>
              <div className="absolute -top-6 -right-6 bg-white rounded-xl p-5 shadow-xl border border-gray-100">
                <div className="text-3xl font-bold text-gray-900">8+</div>
                <div className="text-sm font-medium text-gray-500">Locations</div>
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
              Our Journey
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              A Decade of Growth — 2016 to 2026
            </h2>
            <p className="text-gray-500 text-lg">
              Select any milestone to explore the full story behind each chapter of Saigon Express.
            </p>
          </div>
          <InteractiveTimeline />
        </div>
      </section>

      {/* ── Vietnamese Food Culture ── */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-semibold tracking-widest text-red-600 uppercase mb-3">
              The Food
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Vietnamese Cuisine &amp; Its Story
            </h2>
            <p className="text-gray-500 text-lg">
              Vietnamese cooking is defined by balance — between fresh and cooked, light and rich, familiar and surprising. Each dish carries centuries of history, geography, and culture.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-14">
            {DISHES.map((dish) => (
              <div key={dish.name} className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-video overflow-hidden">
                  <AppImage src={dish.image} alt={dish.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{dish.name}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{dish.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto bg-red-600 rounded-2xl p-10 text-center text-white">
            <p className="text-xl md:text-2xl font-medium leading-relaxed italic mb-6">
              "Vietnamese people can still find the 'essence' of home, while international guests feel a harmonious and accessible experience."
            </p>
            <p className="text-red-200 text-sm font-semibold uppercase tracking-widest mb-6">
              — VietnamPlus / SBS, February 2026
            </p>
            <p className="text-red-100 text-base leading-relaxed">
              Saigon Express was featured by SBS Australia and VietnamPlus (Vietnam's national news agency) in February 2026 as a landmark story of Vietnamese entrepreneurship in Australia — proof that authentic Vietnamese cuisine has earned its place alongside Japanese, Korean, and Thai food in the everyday dining culture of Tasmania.
            </p>
          </div>
        </div>
      </section>

      {/* ── 10-Year Anniversary Banner ── */}
      <section className="py-16 bg-brand-dark text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block text-xs font-bold tracking-widest text-brand-amber uppercase mb-4">🎉 Celebrating 10 Years</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">2016 – 2026: A Decade of Flavour</h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
              From a two-person kitchen in North Hobart to eight locations across Tasmania — this year marks ten years of bringing mum's recipes to your table. <em>"Nay là được 10 năm đó em — mình có thể celebrate năm nay."</em>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[{v:"10",l:"Years"},{v:"8+",l:"Locations"},{v:"100+",l:"Team Members"},{v:"250+",l:"Menu Items"}].map(s => (
                <div key={s.l} className="bg-white/10 rounded-xl p-5">
                  <div className="text-3xl font-bold text-brand-amber">{s.v}</div>
                  <div className="text-sm text-white/60 mt-1">{s.l}</div>
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
              <div className="rounded-2xl overflow-hidden aspect-square shadow-md">
                <AppImage src="/manus-storage/saigo_express__Vietnamese_Roasted_pork_baguette_Native_81be063f.jpg" alt="Bánh mì" fill className="object-cover" />
              </div>
              <div className="rounded-2xl overflow-hidden aspect-square shadow-md mt-8">
                <AppImage src="/manus-storage/saigo_express__Cuon_Vietnamese_prawn_rice_paper_rolls_NativeLarge_d710816c.png" alt="Rice paper rolls" fill className="object-cover" />
              </div>
              <div className="rounded-2xl overflow-hidden aspect-square shadow-md col-span-2">
                <AppImage src="/manus-storage/_Q7A0084addedcontrastandsat_4c8d6b63.jpg" alt="Community" fill className="object-cover" />
              </div>
            </div>
            <div>
              <span className="inline-block text-xs font-semibold tracking-widest text-red-600 uppercase mb-4">
                Community &amp; Culture
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                More Than a Restaurant
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                Saigon Express has always been as much about people as it is about food. The Vietnamese community in Hobart is small but tightly bonded, and the brand has become a gathering place — hosting Mid-Autumn Festival celebrations that draw hundreds of participants, and Lunar New Year dinners for those who cannot travel home.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                The team reflects this multicultural spirit — Vietnamese international students work alongside colleagues from Bangladesh, India, and across Australia, creating a kitchen as diverse as the dishes it produces.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Tasmania, with its cool climate and unhurried pace, has become a true home for many of the team — a place that, in its own quiet way, echoes the highland landscapes of northern Vietnam.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission Statement ── */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block text-xs font-semibold tracking-widest text-red-600 uppercase mb-4">Our Mission</span>
            <blockquote className="text-2xl md:text-3xl font-serif text-gray-900 leading-relaxed mb-6 italic">
              "Mang hương vị ẩm thực Việt đích thực đến gần hơn với cộng đồng, lan tỏa văn hóa ẩm thực quê hương và khẳng định tinh thần khởi nghiệp của người Việt xa xứ."
            </blockquote>
            <p className="text-gray-500 text-lg mb-8">
              To bring authentic Vietnamese cuisine closer to the community, spread the food culture of the homeland, and affirm the entrepreneurial spirit of Vietnamese people living abroad.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2 bg-red-50 px-5 py-3 rounded-full">
                <span className="text-red-600">🍜</span> Món ăn quen thuộc, đậm đà vị nhà
              </div>
              <div className="flex items-center gap-2 bg-red-50 px-5 py-3 rounded-full">
                <span className="text-red-600">🤝</span> Kết nối cộng đồng, quảng bá văn hóa Việt
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
              What We Stand For
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-red-200 hover:bg-red-50/30 transition-colors group">
                  <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center mb-4 group-hover:bg-red-600 transition-colors">
                    <Icon size={20} className="text-red-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-red-600 text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Come Experience the Story</h2>
          <p className="text-red-100 text-lg max-w-xl mx-auto mb-8">
            Eight locations across Tasmania. Dine in, take away, or order for pickup — the flavours of Vietnam are closer than you think.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/stores" className="inline-flex items-center gap-2 bg-white text-red-600 font-semibold px-7 py-3 rounded-full hover:bg-red-50 transition-colors">
              Find a Store <ChevronRight size={16} />
            </Link>
            <Link href="/menu" className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-semibold px-7 py-3 rounded-full hover:border-white hover:bg-white/10 transition-colors">
              View Our Menu
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
