"use client";

import LazyImage from "@/components/LazyImage";
import Link from "@/components/link";
import { ShareDealButton } from "@/components/ShareDealButton";
import type { BlogPost, BlogPostDetail } from "@/types";
import { ArrowLeft, ArrowRight, Calendar, Eye } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const FALLBACK_IMAGE =
  "/manus-storage/news-story-began_47dbdf79.jpg";

const viewedStorageKey = (slug: string) => `blog-viewed:${slug}`;

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

function RelatedPostCard({ post }: { post: BlogPost }) {
  const locale = useLocale();

  const publishedLabel = formatPublishedDate(post.publishedAt, locale);

  return (
    <Link
      href={`/news/${post.slug}`}
      className="group overflow-hidden rounded-sm border border-brand-dark/10 bg-white card-lift"
    >
      <div className="aspect-video overflow-hidden">
        <LazyImage
          src={post.featuredImageUrl ?? FALLBACK_IMAGE}
          alt={post.title}
          wrapperClassName="h-full w-full"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="space-y-2 p-3 sm:p-4">
        {publishedLabel && (
          <p className="text-xs text-brand-dark/40">{publishedLabel}</p>
        )}
        <h4 className="font-semibold text-sm leading-snug text-brand-dark line-clamp-2 group-hover:text-brand-red transition-colors">
          {post.title}
        </h4>
      </div>
    </Link>
  );
}

export default function NewsItem({ post }: { post: BlogPostDetail }) {
  const t = useTranslations("News");
  const locale = useLocale();
  const [displayViewCount, setDisplayViewCount] = useState(post.viewCount);

  useEffect(() => {
    setDisplayViewCount(post.viewCount);
  }, [post.viewCount]);

  useEffect(() => {
    const storageKey = viewedStorageKey(post.slug);
    try {
      if (sessionStorage.getItem(storageKey)) {
        return;
      }
    } catch {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/news/${post.slug}/view`, {
          method: "POST",
        });

        if (!response.ok || cancelled) {
          return;
        }

        const data = (await response.json()) as {
          counted?: boolean;
          viewCount?: number;
        };

        try {
          sessionStorage.setItem(storageKey, "1");
        } catch {
          // ignore storage errors
        }

        if (
          typeof data.viewCount === "number" &&
          data.counted === true &&
          !cancelled
        ) {
          setDisplayViewCount(data.viewCount);
        }
      } catch {
        // fire-and-forget; approximate counts only
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post.slug]);

  const publishedLabel = formatPublishedDate(post.publishedAt, locale);
  const viewsLabel = t("card.views", { count: displayViewCount });

  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="h-16" />

      <div className="border-b border-brand-dark/10 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-sm text-brand-dark/60 transition-colors hover:text-brand-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("detail.backToAll")}
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="news-badge">{post.category}</span>
          {publishedLabel && (
            <span className="inline-flex items-center gap-1 text-xs text-brand-dark/50">
              <Calendar className="h-3.5 w-3.5" />
              {publishedLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-brand-dark/50">
            <Eye className="h-3.5 w-3.5" />
            {viewsLabel}
          </span>
          <div className="ml-auto">
            <ShareDealButton
              title={post.title}
              description={post.excerpt}
              url={`/news/${post.slug}`}
            />
          </div>
        </div>

        <h1 className="mb-4 font-serif text-3xl sm:text-4xl font-bold leading-tight text-brand-dark">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mb-8 border-l-4 border-brand-red pl-4 text-lg leading-relaxed text-brand-dark/65">
            {post.excerpt}
          </p>
        )}

        {post.featuredImageUrl && (
          <div className="mb-8 aspect-video overflow-hidden rounded-2xl">
            <LazyImage
              src={post.featuredImageUrl}
              alt={post.title}
              wrapperClassName="h-full w-full"
              className="h-full w-full object-cover"
              eager
            />
          </div>
        )}

        <div
          className="article-prose mb-12 space-y-4 text-brand-dark/80 leading-relaxed [&_a]:text-brand-red [&_a]:no-underline hover:[&_a]:underline [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-brand-dark [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-brand-dark [&_li]:ml-4 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-4"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.showWholesaleCta && (
          <section className="mb-12 rounded-2xl bg-brand-dark px-6 py-8 text-center text-white sm:px-8">
            <h2 className="mb-2 font-serif text-xl sm:text-2xl font-bold">
              {t("detail.wholesaleCta.title")}
            </h2>
            <p className="mb-4 text-sm text-white/70">
              {t("detail.wholesaleCta.description")}
            </p>
            <Link
              href="/wholesale/landing-shop"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-amber px-5 py-2.5 text-sm font-bold text-brand-dark transition-colors hover:bg-brand-amber/90"
            >
              {t("detail.wholesaleCta.button")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}

        {post.relatedPosts.length > 0 && (
          <section>
            <h3 className="mb-5 font-serif text-xl font-bold text-brand-dark">
              {t("detail.relatedTitle")}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {post.relatedPosts.map((related) => (
                <RelatedPostCard key={related.id} post={related} />
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
