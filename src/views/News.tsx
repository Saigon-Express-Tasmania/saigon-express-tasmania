"use client";

import LazyImage from "@/components/LazyImage";
import Link from "@/components/link";
import { resolvePublicAssetUrl } from "@/lib/resolve-site-url";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/types";
import { Newspaper } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const FALLBACK_IMAGE = "/manus-storage/news-story-began_47dbdf79.jpg";

function formatPublishedDate(
  iso: string | null,
  locale: string,
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PostCardBody({
  post,
  locale,
  readMoreLabel,
  featured = false,
}: {
  post: BlogPost;
  locale: string;
  readMoreLabel: string;
  featured?: boolean;
}) {
  const publishedLabel = formatPublishedDate(post.publishedAt, locale);
  const newsLogoUrl = resolvePublicAssetUrl(post.newsLogoImageUrl);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-start gap-4 sm:gap-6">
        <div
          className={cn(
            "flex shrink-0 flex-col gap-3",
            featured ? "w-[76px] sm:w-[88px]" : "w-[68px] sm:w-[76px]",
          )}
        >
          {newsLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={newsLogoUrl}
              alt={post.category}
              className={cn(
                "block w-full object-contain object-top",
                featured
                  ? "max-h-14 sm:max-h-16"
                  : "max-h-12 sm:max-h-14",
              )}
            />
          ) : (
            <span className="news-badge text-[10px] leading-snug">
              {post.category}
            </span>
          )}
          {publishedLabel && (
            <p className="text-xs font-semibold uppercase leading-snug tracking-wide text-[#666666]">
              {publishedLabel}
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "m-0 font-bold leading-tight text-brand-red",
              featured
                ? "line-clamp-4 text-xl sm:text-2xl lg:text-3xl"
                : "line-clamp-3 text-lg",
            )}
          >
            {post.title}
          </h3>
          {post.excerpt && (
            <p
              className={cn(
                "mt-3 leading-relaxed text-[#444444]",
                featured
                  ? "line-clamp-5 text-base sm:text-[17px]"
                  : "line-clamp-4 text-[15px]",
              )}
            >
              {post.excerpt}
            </p>
          )}
        </div>
      </div>
      <span className="mt-auto pt-4 text-[13px] font-bold tracking-wide text-brand-red">
        {readMoreLabel} →
      </span>
    </div>
  );
}

function FeaturedPostCard({
  post,
  locale,
  readMoreLabel,
}: {
  post: BlogPost;
  locale: string;
  readMoreLabel: string;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-[#eaeaea] bg-white shadow-[0_4px_15px_rgba(0,0,0,0.08)] card-lift">
      <Link href={`/news/${post.slug}`} className="grid lg:grid-cols-2">
        <div className="aspect-[65/32] overflow-hidden border-b border-[#f0f0f0] bg-[#e0e0e0] lg:aspect-auto lg:min-h-[320px] lg:border-b-0 lg:border-r lg:border-[#f0f0f0]">
          <LazyImage
            src={post.featuredImageUrl ?? FALLBACK_IMAGE}
            alt={post.title}
            wrapperClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            eager
          />
        </div>
        <div className="flex flex-1 flex-col px-5 py-4 lg:justify-center lg:px-10 lg:py-10">
          <PostCardBody
            post={post}
            locale={locale}
            readMoreLabel={readMoreLabel}
            featured
          />
        </div>
      </Link>
    </article>
  );
}

function PostCard({
  post,
  locale,
  readMoreLabel,
}: {
  post: BlogPost;
  locale: string;
  readMoreLabel: string;
}) {
  return (
    <article className="group h-full overflow-hidden rounded-xl border border-[#eaeaea] bg-white shadow-[0_4px_15px_rgba(0,0,0,0.08)] card-lift">
      <Link href={`/news/${post.slug}`} className="flex h-full flex-col">
        <div className="aspect-[65/32] overflow-hidden border-b border-[#f0f0f0] bg-[#e0e0e0]">
          <LazyImage
            src={post.featuredImageUrl ?? FALLBACK_IMAGE}
            alt={post.title}
            wrapperClassName="w-full h-full"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-1 flex-col px-5 py-4">
          <PostCardBody
            post={post}
            locale={locale}
            readMoreLabel={readMoreLabel}
          />
        </div>
      </Link>
    </article>
  );
}

export default function News({ posts }: { posts: BlogPost[] }) {
  const t = useTranslations("News");
  const locale = useLocale();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const unique = new Set(posts.map((post) => post.category));
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (activeCategory === "all") return posts;
    return posts.filter((post) => post.category === activeCategory);
  }, [activeCategory, posts]);

  const [featuredPost, ...restPosts] = filteredPosts;

  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="h-16" />

      <section className="border-b border-brand-dark/10 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-[1280px] px-4 text-center">
          <span className="section-label">{t("hero.eyebrow")}</span>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl text-brand-dark">
            {t("hero.heading")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-brand-dark/65 leading-relaxed">
            {t("hero.subheading")}
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1280px] px-4">
          {posts.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {categories.map((category) => {
                const isActive = activeCategory === category;
                const label =
                  category === "all" ? t("filters.all") : category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                      isActive
                        ? "bg-brand-red text-white"
                        : "bg-white text-brand-dark/70 border border-brand-dark/10 hover:border-brand-red/30 hover:text-brand-red",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {filteredPosts.length === 0 ? (
            <div className="rounded-sm border border-dashed border-brand-dark/15 bg-white py-20 text-center">
              <Newspaper className="mx-auto mb-4 h-10 w-10 text-brand-dark/25" />
              <p className="font-serif text-xl text-brand-dark">
                {posts.length === 0
                  ? t("empty.heading")
                  : t("empty.filteredHeading")}
              </p>
              <p className="mt-2 text-sm text-brand-dark/60">
                {posts.length === 0 ? t("empty.body") : t("empty.filteredBody")}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {featuredPost && (
                <FeaturedPostCard
                  post={featuredPost}
                  locale={locale}
                  readMoreLabel={t("card.readMore")}
                />
              )}

              {restPosts.length > 0 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {restPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      locale={locale}
                      readMoreLabel={t("card.readMore")}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
