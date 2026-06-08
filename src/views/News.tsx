"use client";

import LazyImage from "@/components/LazyImage";
import Link from "@/components/link";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/types";
import { Calendar, ChevronRight, Eye, Newspaper } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const FALLBACK_IMAGE =
  "/manus-storage/news-story-began_47dbdf79.jpg";

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

function PostMeta({
  post,
  locale,
  viewsLabel,
}: {
  post: BlogPost;
  locale: string;
  viewsLabel: (count: number) => string;
}) {
  const publishedLabel = formatPublishedDate(post.publishedAt, locale);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-brand-dark/50">
      <span className="news-badge">{post.category}</span>
      {publishedLabel && (
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {publishedLabel}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" />
        {viewsLabel(post.viewCount)}
      </span>
    </div>
  );
}

function FeaturedPostCard({
  post,
  locale,
  readMoreLabel,
  viewsLabel,
}: {
  post: BlogPost;
  locale: string;
  readMoreLabel: string;
  viewsLabel: (count: number) => string;
}) {
  return (
    <article className="group overflow-hidden rounded-sm border border-brand-dark/10 bg-white card-lift">
      <Link href={`/news/${post.slug}`} className="grid gap-0 lg:grid-cols-2">
        <div className="aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[320px]">
          <LazyImage
            src={post.featuredImageUrl ?? FALLBACK_IMAGE}
            alt={post.title}
            wrapperClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            eager
          />
        </div>
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 lg:p-10">
          <PostMeta post={post} locale={locale} viewsLabel={viewsLabel} />
          <h2 className="font-serif text-2xl sm:text-3xl text-brand-dark leading-snug group-hover:text-brand-red transition-colors">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="text-sm sm:text-base text-brand-dark/65 leading-relaxed line-clamp-4">
              {post.excerpt}
            </p>
          )}
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-red">
            {readMoreLabel}
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </article>
  );
}

function PostCard({
  post,
  locale,
  readMoreLabel,
  viewsLabel,
}: {
  post: BlogPost;
  locale: string;
  readMoreLabel: string;
  viewsLabel: (count: number) => string;
}) {
  return (
    <article className="group overflow-hidden rounded-sm border border-brand-dark/10 bg-white card-lift">
      <Link href={`/news/${post.slug}`} className="block">
        <div className="aspect-[16/10] overflow-hidden">
          <LazyImage
            src={post.featuredImageUrl ?? FALLBACK_IMAGE}
            alt={post.title}
            wrapperClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <PostMeta post={post} locale={locale} viewsLabel={viewsLabel} />
          <h3 className="font-serif text-lg text-brand-dark leading-snug group-hover:text-brand-red transition-colors line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-sm text-brand-dark/60 leading-relaxed line-clamp-3">
              {post.excerpt}
            </p>
          )}
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-red">
            {readMoreLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
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

  const viewsLabel = (count: number) => t("card.views", { count });

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
                  viewsLabel={viewsLabel}
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
                      viewsLabel={viewsLabel}
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
