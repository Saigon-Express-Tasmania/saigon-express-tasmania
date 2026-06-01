"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { pickMenuImageUrl, type MenuImageUrls } from "@/types";
import "react-inner-image-zoom/lib/styles.min.css";

const InnerImageZoom = dynamic(() => import("react-inner-image-zoom"), {
  ssr: false,
  loading: () => (
    <div className="aspect-[4/3] w-full animate-pulse bg-gray-100" aria-hidden />
  ),
});

const DEFAULT_IMG = "/manus-storage/banh-mi-1_9ba4dcf0.jpg";

type MenuItemImageZoomProps = {
  imageUrls?: MenuImageUrls | null;
  alt: string;
  className?: string;
};

export default function MenuItemImageZoom({
  imageUrls,
  alt,
  className,
}: MenuItemImageZoomProps) {
  const t = useTranslations("MenuItem");
  const src =
    pickMenuImageUrl(imageUrls, [1024, 512, 1920, 256]) ?? DEFAULT_IMG;
  const zoomSrc =
    pickMenuImageUrl(imageUrls, [1920, 1024, 512]) ?? src;

  return (
    <div
      className={`menu-item-image-zoom relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${className ?? ""}`}
    >
      <div className="absolute inset-0 overflow-hidden">
        <InnerImageZoom
          src={src}
          zoomSrc={zoomSrc}
          zoomType="hover"
          zoomPreload
          zoomScale={1.35}
          moveType="pan"
          hideHint
          className="menu-item-image-zoom__figure"
          imgAttributes={{
            alt,
            className: "menu-item-image-zoom__img",
            loading: "eager",
            fetchPriority: "high",
          }}
        />
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 z-20 rounded bg-black/60 px-2.5 py-1 text-[11px] text-white">
        {t("magnifierHint")}
      </p>
    </div>
  );
}
