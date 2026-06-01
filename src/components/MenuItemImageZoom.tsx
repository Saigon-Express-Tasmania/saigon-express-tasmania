"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import "react-inner-image-zoom/lib/styles.min.css";

const InnerImageZoom = dynamic(() => import("react-inner-image-zoom"), {
  ssr: false,
  loading: () => (
    <div className="aspect-[4/3] w-full animate-pulse bg-gray-100" aria-hidden />
  ),
});

const DEFAULT_IMG = "/manus-storage/banh-mi-1_9ba4dcf0.jpg";
const ZOOM_SCALE = 2;

type MenuItemImageZoomProps = {
  /** Display image (typically lg or mid-size). */
  src: string;
  /** Zoom source (typically largest variant). Defaults to `src`. */
  zoomSrc?: string;
  alt: string;
  className?: string;
};

export default function MenuItemImageZoom({
  src,
  zoomSrc,
  alt,
  className,
}: MenuItemImageZoomProps) {
  const t = useTranslations("MenuItem");

  const displaySrc = src?.trim() || DEFAULT_IMG;
  const magnifySrc = zoomSrc?.trim() || displaySrc;

  return (
    <div
      className={`menu-item-image-zoom relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white aspect-[4/3] shadow-sm ${className ?? ""}`}
    >
      <div className="absolute inset-0">
        <InnerImageZoom
          key={magnifySrc}
          src={displaySrc}
          zoomSrc={magnifySrc}
          zoomType="hover"
          zoomPreload
          moveType="pan"
          hideHint
          className="menu-item-image-zoom__figure"
          imgAttributes={{
            alt,
            className: "menu-item-image-zoom__img",
            loading: "eager",
            fetchPriority: "high"
          }}
        />
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 z-20 rounded bg-black/60 px-2.5 py-1 text-[11px] text-white">
        {t("magnifierHint")}
      </p>
    </div>
  );
}
