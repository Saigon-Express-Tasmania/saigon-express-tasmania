"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getVisibleFoodContentLabelIds } from "@/lib/food-content-label-visibility";

type FoodContentLabelsProps = {
  foodContent: unknown;
  className?: string;
  variant?: "overlay" | "accent";
};

const labelClassNames = {
  overlay:
    "shrink-0 rounded bg-white/92 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-brand-dark shadow-md backdrop-blur-sm",
  accent:
    "shrink-0 rounded bg-accent px-2 py-0.5 text-[10px] font-semibold leading-tight text-white",
} as const;

export default function FoodContentLabels({
  foodContent,
  className = "",
  variant = "overlay",
}: FoodContentLabelsProps) {
  const t = useTranslations("MenuItem");
  const containerRef = useRef<HTMLDivElement>(null);
  const [fadeRight, setFadeRight] = useState(false);

  const visibleLabelIds = useMemo(
    () => getVisibleFoodContentLabelIds(foodContent),
    [foodContent],
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateFade = () => {
      setFadeRight(el.scrollWidth > el.clientWidth + 1);
    };

    updateFade();

    const observer = new ResizeObserver(updateFade);
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleLabelIds]);

  if (visibleLabelIds.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`flex flex-nowrap items-center gap-1 overflow-hidden ${className}`.trim()}
      style={
        fadeRight
          ? {
              WebkitMaskImage:
                "linear-gradient(to right, black calc(100% - 1.25rem), transparent)",
              maskImage:
                "linear-gradient(to right, black calc(100% - 1.25rem), transparent)",
            }
          : undefined
      }
    >
      {visibleLabelIds.map((labelId) => (
        <span
          key={labelId}
          className={labelClassNames[variant]}
        >
          {t(`foodContentVisibility.${labelId}`)}
        </span>
      ))}
    </div>
  );
}
