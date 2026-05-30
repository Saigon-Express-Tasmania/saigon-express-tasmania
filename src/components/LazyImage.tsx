"use client";

import AppImage from "@/components/AppImage";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  /** Aspect ratio wrapper class, e.g. "aspect-[4/3]" */
  wrapperClassName?: string;
  eager?: boolean;
  sizes?: string;
}

/**
 * LazyImage — intersection-observer lazy loader with fade-in.
 * Remounts the image when the route changes (Next.js back/forward via usePathname).
 */
export default function LazyImage({
  src,
  alt,
  className = "",
  skeletonClassName = "",
  wrapperClassName = "",
  eager = false,
  sizes,
}: LazyImageProps) {
  const [navKey, setNavKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(eager);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const wasInViewRef = useRef(eager);
  const skipPathnameBumpRef = useRef(true);

  const resetForReveal = useCallback(
    (keepVisible: boolean) => {
      setLoaded(false);
      setError(false);
      const visible = eager || keepVisible;
      wasInViewRef.current = visible;
      setInView(visible);
    },
    [eager],
  );

  const markInViewIfVisible = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const visible =
      rect.top < window.innerHeight + 200 && rect.bottom > -200;
    if (visible) {
      wasInViewRef.current = true;
      setInView(true);
    }
  }, []);

  useEffect(() => {
    resetForReveal(false);
    setNavKey(0);
    skipPathnameBumpRef.current = true;
  }, [src, resetForReveal]);

  // Bump key on pathname change so App Router back/forward remounts the image.
  useEffect(() => {
    if (skipPathnameBumpRef.current) {
      skipPathnameBumpRef.current = false;
      return;
    }
    setNavKey((k) => k + 1);
    resetForReveal(wasInViewRef.current);
    requestAnimationFrame(markInViewIfVisible);
  }, [resetForReveal, markInViewIfVisible]);

  useEffect(() => {
    if (inView) wasInViewRef.current = true;
  }, [inView]);

  useEffect(() => {
    if (eager) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          wasInViewRef.current = true;
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, src, navKey]);

  const showImage = (wasInViewRef.current || inView) && !error;

  return (
    <div
      ref={ref}
      className={cn(
        "relative block size-full min-h-0 overflow-hidden bg-gray-100",
        wrapperClassName,
      )}
    >
      {!loaded && !error && (
        <div
          className={cn(
            "absolute inset-0 z-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-[shimmer_1.4s_infinite]",
            skeletonClassName,
          )}
        />
      )}

      {showImage && (
        <AppImage
          src={src}
          alt={alt}
          fill
          priority={eager}
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "relative z-[1] object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
        />
      )}

      {error && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-gray-100">
          <span className="text-gray-400 text-xs">No image</span>
        </div>
      )}
    </div>
  );
}
