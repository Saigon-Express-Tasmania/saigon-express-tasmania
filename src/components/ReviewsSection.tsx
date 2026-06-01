"use client";

import { useEffect, useRef, useState } from "react";
import type { FeaturedReview } from "@/types";
import { useTranslations } from "next-intl";

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div
      className="flex gap-0.5"
      role="img"
      aria-label={`${rating} out of ${max} stars`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          fill={i < rating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={i < rating ? 0 : 1.5}
          className={`w-4 h-4 ${i < rating ? "text-amber-400" : "text-stone-500"}`}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-red-700",
  "bg-amber-700",
  "bg-emerald-700",
  "bg-sky-700",
  "bg-violet-700",
  "bg-rose-700",
  "bg-teal-700",
  "bg-orange-700",
];

function ReviewerAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const colorIdx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    AVATAR_COLORS.length;
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${AVATAR_COLORS[colorIdx]}`}
    >
      {initials}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────
interface ReviewCardProps {
  reviewerName: string;
  rating: number;
  reviewText: string;
  location: string | null;
}

function ReviewCard({
  reviewerName,
  rating,
  reviewText,
  location,
}: ReviewCardProps) {
  return (
    <div className="flex-shrink-0 w-80 bg-stone-900 border border-stone-800 rounded-2xl p-6 flex flex-col gap-4 mx-3 select-none">
      {/* Top row: avatar + name + location */}
      <div className="flex items-center gap-3">
        <ReviewerAvatar name={reviewerName} />
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">
            {reviewerName}
          </p>
          {location && (
            <p className="text-stone-400 text-xs mt-0.5 truncate">{location}</p>
          )}
        </div>
        {/* Google G badge */}
        <div className="ml-auto flex-shrink-0">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            aria-label="Google Review"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </div>
      </div>

      {/* Star rating */}
      <StarRating rating={rating} />

      {/* Review text */}
      <p className="text-stone-300 text-sm leading-relaxed line-clamp-4 flex-1">
        &ldquo;{reviewText}&rdquo;
      </p>
    </div>
  );
}

// ─── Reviews Section ──────────────────────────────────────────────────────────
type ReviewsSectionProps = {
  reviews: FeaturedReview[];
};

export default function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const t = useTranslations("ReviewCard");

  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);

  // Duplicate reviews for seamless infinite scroll
  const displayReviews =
    reviews && reviews.length > 0 ? [...reviews, ...reviews] : [];

  useEffect(() => {
    const track = trackRef.current;
    if (!track || displayReviews.length === 0) return;

    const SPEED = 0.4; // px per frame

    // ✅ FIX: Calculate width ONCE outside of the loop
    let halfWidth = track.scrollWidth / 2;

    const animate = () => {
      if (!isPaused) {
        posRef.current += SPEED;

        // ✅ FIX: Use the cached variable instead of reading the DOM
        if (posRef.current >= halfWidth) {
          posRef.current = 0;
        }
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    // ✅ FIX: Update the cached width only if the browser window resizes
    const handleResize = () => {
      halfWidth = track.scrollWidth / 2;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [displayReviews.length, isPaused]);

  const avgRating =
    reviews && reviews.length > 0
      ? (
          reviews.reduce(
            (s: number, r: { rating: number }) => s + r.rating,
            0,
          ) / reviews.length
        ).toFixed(1)
      : "5.0";

  return (
    <section className="py-20 bg-stone-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
        {/* Eyebrow */}
        <p className="text-red-500 text-xs font-bold tracking-widest uppercase mb-3">
          What Our Customers Say
        </p>

        {/* Heading */}
        <h2 className="font-serif text-4xl md:text-5xl text-white leading-tight mb-4">
          Loved Across <em className="italic text-red-400">Tasmania</em>
        </h2>

        {/* Aggregate rating */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <StarRating rating={5} />
          <span className="text-white font-bold text-lg">{avgRating}</span>
          <span className="text-stone-400 text-sm">
            · {reviews?.length ?? 0} verified reviews
          </span>
        </div>
      </div>

      {/* Scrolling carousel */}
      {displayReviews.length > 0 ? (
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Left fade */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-stone-950 to-transparent z-10 pointer-events-none" />
          {/* Right fade */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-stone-950 to-transparent z-10 pointer-events-none" />

          <div className="overflow-hidden">
            <div
              ref={trackRef}
              className="flex will-change-transform"
              style={{ width: "max-content" }}
            >
              {displayReviews.map((review, idx) => (
                <ReviewCard
                  key={`${review.id}-${idx}`}
                  reviewerName={review.reviewerName}
                  rating={review.rating}
                  reviewText={review.reviewText}
                  location={review.location ?? null}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-2 mt-10 text-stone-400 text-xs">
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>{t("powered")}</span>
      </div>
    </section>
  );
}
