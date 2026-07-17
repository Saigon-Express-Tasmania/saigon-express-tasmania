import LazyImage from "@/components/LazyImage";
import Link from "@/components/link";
import { getBlogPosts } from "@/lib/supabase/blog-posts";
import { resolvePublicAssetUrl } from "@/lib/resolve-site-url";
import type { BlogPost } from "@/types";
import { getLocale, getTranslations } from "next-intl/server";

const HOME_NEWS_LIMIT = 3;
const NEWS_FALLBACK_IMAGE =
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

export default async function HomeNewsSection() {
  const [t, locale, allPosts] = await Promise.all([
    getTranslations("Home"),
    getLocale(),
    getBlogPosts(),
  ]);
  const newsPosts = allPosts.slice(0, HOME_NEWS_LIMIT);

  if (newsPosts.length === 0) {
    return null;
  }

  return (
    <section className="py-8 bg-white">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsPosts.map((post: BlogPost, i) => {
            const publishedLabel = formatPublishedDate(
              post.publishedAt,
              locale,
            );
            const newsLogoUrl = resolvePublicAssetUrl(post.newsLogoImageUrl);

            return (
              <article
                key={post.id}
                className="group reveal h-full overflow-hidden rounded-xl border border-[#eaeaea] bg-white shadow-[0_4px_15px_rgba(0,0,0,0.08)] card-lift"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <Link
                  href={`/news/${post.slug}`}
                  className="flex h-full flex-col"
                >
                  <div className="aspect-[65/32] overflow-hidden border-b border-[#f0f0f0] bg-[#e0e0e0]">
                    <LazyImage
                      src={post.featuredImageUrl ?? NEWS_FALLBACK_IMAGE}
                      alt={post.title}
                      wrapperClassName="w-full h-full"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col px-5 py-4">
                    <div className="flex items-start gap-4 sm:gap-6">
                      <div className="flex w-[72px] shrink-0 flex-col gap-3 sm:w-[96px]">
                        {newsLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={newsLogoUrl}
                            alt={post.category}
                            className="block max-h-12 w-full object-contain object-top sm:max-h-14"
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
                        <h3 className="m-0 line-clamp-3 text-lg font-bold leading-tight text-brand-red">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="mt-3 line-clamp-4 text-[15px] leading-relaxed text-[#444444]">
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="mt-auto pt-4 text-[13px] font-bold tracking-wide text-brand-red">
                      {t("news.readMore")} →
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
