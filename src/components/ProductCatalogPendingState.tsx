"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProductCatalogPendingStateProps = {
  isPending: boolean;
  children: ReactNode;
  className?: string;
  /** Skeleton cards while pending. */
  skeletonCount?: number;
  gridClassName?: string;
  /** Aspect class for skeleton image areas. */
  imageAspectClass?: string;
};

function CatalogSkeletonCard({
  imageAspectClass,
}: {
  imageAspectClass: string;
}) {
  return (
    <div className="overflow-hidden bg-white">
      <div
        className={cn(
          "w-full bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]",
          imageAspectClass,
        )}
      />
      <div className="space-y-2.5 p-3 sm:p-4">
        <div className="h-2.5 w-1/4 rounded-sm bg-stone-200/90" />
        <div className="h-4 w-3/4 rounded-sm bg-stone-200" />
        <div className="h-3 w-full rounded-sm bg-stone-100" />
        <div className="h-3 w-2/3 rounded-sm bg-stone-100" />
      </div>
    </div>
  );
}

export default function ProductCatalogPendingState({
  isPending,
  children,
  className,
  skeletonCount = 8,
  gridClassName = "grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4 xl:gap-6 2xl:grid-cols-5",
  imageAspectClass = "aspect-[4/3]",
}: ProductCatalogPendingStateProps) {
  return (
    <div
      className={cn("relative", className)}
      aria-busy={isPending || undefined}
    >
      {isPending ? (
        <div
          className={cn(gridClassName)}
          aria-hidden
          aria-live="polite"
        >
          <span className="sr-only">Loading products</span>
          {Array.from({ length: skeletonCount }, (_, index) => (
            <CatalogSkeletonCard
              key={index}
              imageAspectClass={imageAspectClass}
            />
          ))}
        </div>
      ) : (
        <div className="animate-[catalog-fade-in_220ms_ease-out]">
          {children}
        </div>
      )}
    </div>
  );
}
