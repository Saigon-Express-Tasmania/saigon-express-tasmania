import AppImage from "@/components/AppImage";
import HomeMediaPreload from "@/components/HomeMediaPreload";
import LazyImage from "@/components/LazyImage";
import Link from "@/components/link";

import dynamic from "next/dynamic";
import type { MenuItem } from "@/contexts/CartContext";
import type { FeaturedReview } from "@/types";
import { getTranslations } from "next-intl/server";
import { ChevronRight, MapPin, ShoppingCart } from "lucide-react";

const GetApp = dynamic(() => import("@/components/GetApp"));
const ReviewsSection = dynamic(() => import("@/components/ReviewsSection"));

// ── Uploaded food photography ─────────────────────────────────────────────────
const IMGS = {
  ourFood: "/manus-storage/saigo_express__hero_Native_5d9afb69.webp",
  ourFood2a:
    "/manus-storage/saigo_express__Vietnamese_Roasted_pork_baguette_Native_81be063f.jpg",
  ourFood2b:
    "/manus-storage/saigo_express__Combination_beef_noodle_soup_pho_NativeLarge_30ae4434.png",
  ourFood2c: "/manus-storage/_Q7A0084addedcontrastandsat_4c8d6b63.jpg",
  ourFood2d:
    "/manus-storage/saigo_express__Cuon_Vietnamese_prawn_rice_paper_rolls_NativeLarge_d710816c.png",
  ourFood2e:
    "/manus-storage/saigo_express__Vietnamese_rice_noodle_salad_bun_NativeLarge_724e0124.png",
  ourFood2f:
    "/manus-storage/saigo_express__Viet_rice_Grilled_pork_and_fried_egg_rice_Native_fc6d43db.jpg",
  catering: "/manus-storage/catering-hero-counter_71eb7271.jpg",
  cateringBox: "/manus-storage/SaigonFeastBox_6c26a5d8.jpg",
  signature: "/manus-storage/banh-mi-3_465cb7d1.jpg",
  cat1: "/manus-storage/banh-mi-2_7d02846f.jpg",
  cat2: "/manus-storage/pho-2_4fc44f9f.jpg",
  cat3: "/manus-storage/spring-rolls-1_02f22814.jpg",
  wholesale: "/manus-storage/wholesale-restaurant-counter_2d79d665.jpg",
  news1: "/manus-storage/news-story-began_47dbdf79.jpg",
  news2: "/manus-storage/news-team-behind_03530abb.jpg",
  news3: "/manus-storage/sorell_store_food_36779d67.jpg",
};

const CATEGORY_IMAGES = [
  "/manus-storage/hero-stir-fried-noodles_84d4beca.jpg",
  "/manus-storage/saigo_express__Hot_plate_chicken_lemongrass_and_chilli_NativeLarge_421583fc.png",
  "/manus-storage/saigo_express__Roasted_pork_and_roasted_duck_NativeLarge_aff2e8e9.png",
] as const;

const NEWS_IMAGES = [IMGS.news1, IMGS.news2, IMGS.news3] as const;

type HomeProps = {
  menuItems: MenuItem[];
  featuredReviews: FeaturedReview[];
};

export default async function Home({ menuItems, featuredReviews }: HomeProps) {
  const t = await getTranslations("Home");

  const marqueeItems = t.raw("marquee.items") as string[];
  const ourFoodTags = t.raw("ourFood.tags") as string[];
  const cateringTags = t.raw("catering.tags") as string[];
  const wholesaleTags = t.raw("wholesale.tags") as string[];
  const categoryItems = t.raw("categories.items") as Array<{
    title: string;
    desc: string;
  }>;
  const newsItems = t.raw("news.items") as Array<{
    date: string;
    tag: string;
    title: string;
    excerpt: string;
  }>;

  const bestSellers = menuItems
    .filter((m) => Boolean(m.isAvailable) && Boolean(m.isPopular))
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-dark">
      <HomeMediaPreload />
      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative h-[88vh] min-h-[560px] overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          poster="/images/intro-cover.jpg"
        >
          <source src="/videos/intro.webm" type="video/webm" />
          <source src="/videos/intro-960.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-6 md:px-12 lg:px-20 max-w-[1280px] mx-auto">
          <span className="inline-block mb-4 text-xs font-bold tracking-[0.18em] uppercase text-white bg-brand-red px-3 py-1.5 rounded-sm w-fit">
            {t("hero.badge")}
          </span>
          <h1 className="font-serif text-white text-5xl md:text-6xl lg:text-7xl leading-[1.05] max-w-2xl mb-5">
            {t("hero.titleLine1")}
            <br />
            <span className="italic">{t("hero.titleLine2")}</span>
          </h1>
          <p className="text-white/75 text-base md:text-lg max-w-lg mb-8 font-sans font-light">
            {t("hero.description")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/menu" className="btn-red">
              <ShoppingCart size={16} /> {t("hero.orderOnline")}
            </Link>
            <Link href="/catering" className="btn-outline-white">
              {t("hero.catering")}
            </Link>
            <Link href="/stores" className="btn-outline-white">
              <MapPin size={16} /> {t("hero.findUs")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── MARQUEE TICKER ──────────────────────────────────────────────── */}
      <div className="bg-brand-red py-3 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-3 mx-4 text-white text-sm font-semibold tracking-wider uppercase"
            >
              {item}
              <span className="text-white/40">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── OUR FOOD ─────────────────────────────────── */}
      <section
        className="py-20 lg:py-28 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1a0a00 0%, #2d0f00 40%, #1a0a00 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #c8102e 0%, transparent 50%), radial-gradient(circle at 80% 20%, #c8102e 0%, transparent 40%)",
          }}
        />

        <div className="max-w-[1280px] mx-auto px-4 mb-12 reveal">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-brand-red/80 mb-3">
            {t("ourFood.label")}
          </span>
          <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl text-white leading-tight">
            {t("ourFood.titleLine1")}
            <br />
            <span className="text-brand-red italic">
              {t("ourFood.titleLine2")}
            </span>
          </h2>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 grid lg:grid-cols-[3fr_2fr] gap-8 items-center">
          <div className="relative overflow-hidden rounded-sm reveal shadow-2xl">
            <div
              className="relative w-full h-[520px]"
              style={{ aspectRatio: "64/51" }}
            >
              <AppImage
                src={IMGS.ourFood}
                alt={t("ourFood.imageAlt")}
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-sm px-4 py-3 shadow-lg">
              <p className="text-xs font-bold tracking-widest uppercase text-brand-red mb-0.5">
                {t("ourFood.badgeTitle")}
              </p>
              <p className="text-sm font-medium text-brand-dark">
                {t("ourFood.badgeSubtitle")}
              </p>
            </div>
          </div>

          <div className="reveal" style={{ animationDelay: "0.15s" }}>
            <p className="text-white/70 text-base leading-relaxed mb-6">
              {t("ourFood.description")}
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {ourFoodTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase text-white border border-white/20 bg-white/10"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Link href="/menu" className="btn-red">
              {t("ourFood.cta")} <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 mt-10 grid grid-cols-2 md:grid-cols-3 gap-3 reveal">
          {[
            IMGS.ourFood2a,
            IMGS.ourFood2b,
            IMGS.ourFood2c,
            IMGS.ourFood2d,
            IMGS.ourFood2e,
            IMGS.ourFood2f,
          ].map((src, i) => (
            <div key={i} className="overflow-hidden rounded-sm aspect-[4/3]">
              <LazyImage
                src={src}
                alt={t("ourFood.mosaicAlt")}
                wrapperClassName="w-full h-full"
                className="hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── CATERING ─────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative reveal">
            <div className="relative w-full h-[480px] rounded-sm overflow-hidden">
              <AppImage
                src={IMGS.catering}
                alt={t("catering.imageAlt")}
                fill
                className="object-cover rounded-sm"
              />
            </div>
            <div className="absolute bottom-6 right-6 bg-white rounded-sm shadow-xl p-4 max-w-[180px]">
              <AppImage
                src={IMGS.cateringBox}
                alt={t("catering.boxImageAlt")}
                width={320}
                height={96}
                className="w-full h-24 object-cover rounded-sm mb-2"
              />
              <p className="text-xs font-bold text-brand-dark">
                {t("catering.boxTitle")}
              </p>
              <p className="text-xs text-brand-dark/60">
                {t("catering.boxSubtitle")}
              </p>
            </div>
          </div>

          <div className="reveal" style={{ animationDelay: "0.15s" }}>
            <span className="section-label">{t("catering.label")}</span>
            <h2 className="font-serif text-4xl md:text-5xl text-brand-dark mt-3 mb-5">
              {t("catering.titleLine1")}
              <br />
              <span className="text-brand-red italic">
                {t("catering.titleLine2")}
              </span>
            </h2>
            <p className="text-brand-dark/70 text-base leading-relaxed mb-6">
              {t("catering.description")}
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              {cateringTags.map((tag) => (
                <span key={tag} className="pill-tag">
                  {tag}
                </span>
              ))}
            </div>
            <Link href="/catering" className="btn-red">
              {t("catering.cta")} <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SIGNATURE ─────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden">
        <AppImage
          src="/manus-storage/IMG_4152Large_d9da7044.png"
          alt={t("signature.imageAlt")}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 text-center">
          <span className="section-label text-white/60 mb-4 block">
            {t("signature.label")}
          </span>
          <h2 className="font-serif text-white text-5xl md:text-6xl lg:text-7xl mb-5">
            {t("signature.titleLine1")}
            <br />
            <span className="italic">{t("signature.titleLine2")}</span>
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
            {t("signature.description")}
          </p>
          <Link href="/menu" className="btn-outline-white">
            {t("signature.cta")} <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── SOMETHING FOR EVERYONE ────────────────── */}
      <section className="py-20 lg:py-28 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="text-center mb-12 reveal">
            <span className="section-label">{t("categories.label")}</span>
            <h2 className="font-serif text-4xl md:text-5xl text-brand-dark mt-3">
              {t("categories.title")}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {categoryItems.map((cat, i) => (
              <Link
                key={i}
                href="/menu"
                className="group block overflow-hidden rounded-sm card-lift reveal"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="overflow-hidden aspect-[4/3]">
                  <LazyImage
                    src={CATEGORY_IMAGES[i]}
                    alt={cat.title}
                    wrapperClassName="w-full h-full"
                    className="group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="pt-4 pb-2">
                  <h3 className="font-serif text-xl text-brand-dark mb-1">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-brand-dark/60 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── BEST SELLERS ───────────────────────────── */}
      {bestSellers.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-[1280px] mx-auto px-4">
            <div className="flex items-end justify-between mb-10 reveal">
              <div>
                <span className="section-label">{t("bestSellers.label")}</span>
                <h2 className="font-serif text-4xl text-brand-dark mt-2">
                  {t("bestSellers.title")}
                </h2>
              </div>
              <Link
                href="/menu"
                className="text-sm font-semibold text-brand-red hover:underline flex items-center gap-1"
              >
                {t("bestSellers.seeFullMenu")} <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {bestSellers.map((item, i) => (
                <Link
                  key={item.id}
                  href="/menu"
                  className="group block bg-brand-cream rounded-sm overflow-hidden card-lift reveal"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <LazyImage
                      src={
                        item.imageUrl ??
                        [IMGS.cat1, IMGS.cat2, IMGS.cat3, IMGS.ourFood2a][i % 4]
                      }
                      alt={item.name}
                      wrapperClassName="w-full h-full"
                      className="group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-1">
                      {item.category}
                    </p>
                    <h3 className="font-serif text-lg text-brand-dark leading-tight mb-1">
                      {item.name}
                    </h3>
                    <p className="text-sm text-brand-dark/60 line-clamp-2 mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-brand-dark">
                        ${Number(item.price).toFixed(2)}
                      </span>
                      <span className="text-xs text-brand-red font-semibold">
                        {t("bestSellers.order")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── WHOLESALE ─────────────────────────────── */}
      <section className="bg-brand-dark py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div className="reveal">
            <div className="relative w-full h-[400px] rounded-sm overflow-hidden">
              <AppImage
                src={IMGS.wholesale}
                alt={t("wholesale.imageAlt")}
                fill
                className="object-cover rounded-sm"
              />
            </div>
          </div>
          <div className="reveal" style={{ animationDelay: "0.15s" }}>
            <span className="section-label text-white/50">
              {t("wholesale.label")}
            </span>
            <h2 className="font-serif text-white text-4xl md:text-5xl mt-3 mb-5">
              {t("wholesale.titleLine1")}
              <br />
              <span className="text-brand-red italic">
                {t("wholesale.titleLine2")}
              </span>
            </h2>
            <p className="text-white/65 text-base leading-relaxed mb-6">
              {t("wholesale.description")}
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {wholesaleTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1.5 rounded-full border border-white/20 text-white/70 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Link href="/wholesale/landing-shop" className="btn-red">
              {t("wholesale.cta")} <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── GET THE APP ─────────────────────────────────────────────────── */}
      <section className="py-16 bg-brand-cream border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 reveal">
          <div>
            <span className="section-label">{t("getApp.label")}</span>
            <h2 className="font-serif text-3xl text-brand-dark mt-2">
              {t("getApp.title")}
            </h2>
            <p className="text-brand-dark/60 text-sm mt-2">
              {t("getApp.description")}
            </p>
          </div>
          <Link href="/get-the-app" className="btn-red flex-shrink-0">
            {t("getApp.cta")} <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── NEWS ────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="flex items-end justify-between mb-10 reveal">
            <div>
              <span className="section-label">{t("news.label")}</span>
              <h2 className="font-serif text-4xl text-brand-dark mt-2">
                {t("news.title")}
              </h2>
            </div>
            <Link href="/news" className="text-sm font-semibold text-brand-red hover:underline flex items-center gap-1">
              {t("news.viewAll")} <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsItems.map((n, i) => (
              <article
                key={i}
                className="group block overflow-hidden rounded-sm card-lift reveal"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="overflow-hidden aspect-[4/3]">
                  <LazyImage
                    src={NEWS_IMAGES[i]}
                    alt={n.title}
                    wrapperClassName="w-full h-full"
                    className="group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="pt-4 pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="news-badge">{n.tag}</span>
                    <span className="text-xs text-brand-dark/40">{n.date}</span>
                  </div>
                  <h3 className="font-serif text-base text-brand-dark leading-snug mb-2">
                    {n.title}
                  </h3>
                  <p className="text-xs text-brand-dark/60 leading-relaxed line-clamp-3">
                    {n.excerpt}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── BECOME A PARTNER CTA ────────────────────────────────────────── */}
      <section className="py-16 bg-brand-red">
        <div className="max-w-[1280px] mx-auto px-4 text-center reveal">
          <h2 className="font-serif text-white text-4xl md:text-5xl mb-4">
            {t("partner.title")}
          </h2>
          <p className="text-white/80 text-base max-w-xl mx-auto mb-8">
            {t("partner.description")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/wholesale/landing-shop" className="btn-outline-white">
              {t("partner.wholesale")}
            </Link>
            <Link href="/franchise" className="btn-outline-white">
              {t("partner.franchise")}
            </Link>
            <Link href="/catering" className="btn-outline-white">
              {t("partner.catering")}
            </Link>
          </div>
        </div>
      </section>

      <GetApp />
      <ReviewsSection reviews={featuredReviews} />
    </div>
  );
}
