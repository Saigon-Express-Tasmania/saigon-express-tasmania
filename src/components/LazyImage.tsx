"use client";

import { useState, useRef, useEffect } from "react";
import AppImage from "@/components/AppImage";

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
 * LazyImage — intersection-observer based lazy loader with:
 * - Gray skeleton placeholder while not yet in viewport
 * - Smooth fade-in once the image loads
 * - Graceful fallback on error
 */
export default function LazyImage({
  src,
  alt,
  className = "",
  wrapperClassName = "",
  eager = false,
  sizes,
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(eager);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eager) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <div ref={ref} className={`relative overflow-hidden bg-gray-100 ${wrapperClassName}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-[shimmer_1.4s_infinite]" />
      )}

      {inView && !error && (
        <AppImage
          src={src}
          alt={alt}
          fill
          priority={eager}
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
        />
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-gray-400 text-xs">No image</span>
        </div>
      )}
    </div>
  );
}
