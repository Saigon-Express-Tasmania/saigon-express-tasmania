"use client";

import { Minus, Plus } from "lucide-react";
import {
  formatFranchiseResourceViewerZoom,
  FRANCHISE_RESOURCE_VIEWER_ZOOM_MAX,
  FRANCHISE_RESOURCE_VIEWER_ZOOM_MIN,
} from "@/components/franchise-resources/franchise-resource-viewer-zoom";
import { cn } from "@/lib/utils";

type FranchiseResourceDocumentZoomNavProps = {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
};

export default function FranchiseResourceDocumentZoomNav({
  scale,
  onZoomIn,
  onZoomOut,
  className,
}: FranchiseResourceDocumentZoomNavProps) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-0.5 sm:gap-1", className)}
      aria-label="Zoom controls"
    >
      <button
        type="button"
        onClick={onZoomOut}
        disabled={scale <= FRANCHISE_RESOURCE_VIEWER_ZOOM_MIN}
        className="flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary disabled:opacity-40 sm:h-9 sm:w-9"
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </button>

      <span className="min-w-[2.75rem] text-center text-xs font-medium tabular-nums text-foreground sm:min-w-[3rem] sm:text-sm">
        {formatFranchiseResourceViewerZoom(scale)}
      </span>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={scale >= FRANCHISE_RESOURCE_VIEWER_ZOOM_MAX}
        className="flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary disabled:opacity-40 sm:h-9 sm:w-9"
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
