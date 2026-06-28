"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import FranchiseResourceFileViewerHeader from "@/components/franchise-resources/FranchiseResourceFileViewerHeader";
import {
  DOCUMENT_VIEWER_FRAME_CLASS,
  DOCUMENT_VIEWER_HUB_FRAME_CLASS,
  DOCUMENT_VIEWER_SCROLL_FILL_TOUCH_CLASS,
  DOCUMENT_VIEWER_SCROLL_TOUCH_CLASS,
} from "@/components/franchise-resources/document-viewer-layout";
import { cn } from "@/lib/utils";
import { getFileNameFromStoragePath } from "@/types/franchise-resources";

type FranchiseResourceImageViewerProps = {
  url: string;
  title?: string;
  fillHeight?: boolean;
  externalBottomBar?: boolean;
};

export default function FranchiseResourceImageViewer({
  url,
  title = "Image",
  fillHeight = false,
  externalBottomBar = false,
}: FranchiseResourceImageViewerProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
  }, [url]);

  const scrollClassName = fillHeight
    ? DOCUMENT_VIEWER_SCROLL_FILL_TOUCH_CLASS
    : DOCUMENT_VIEWER_SCROLL_TOUCH_CLASS;

  return (
    <div
      className={cn(
        DOCUMENT_VIEWER_FRAME_CLASS,
        "rounded-lg border border-border bg-muted/30",
        fillHeight && "min-h-0 flex-1",
        fillHeight && DOCUMENT_VIEWER_HUB_FRAME_CLASS,
      )}
    >
      <FranchiseResourceFileViewerHeader
        title={title}
        downloadUrl={url}
        downloadFileName={getFileNameFromStoragePath(url)}
        externalBottomBar={externalBottomBar}
      />

      <div
        className={cn(
          "flex min-h-0 flex-col",
          fillHeight ? "min-h-0 flex-1" : "",
        )}
      >
        <div className={cn(scrollClassName, "min-h-0")}>
          <div className="relative flex min-h-[min(240px,45dvh)] items-center justify-center p-2 sm:min-h-[320px] sm:p-4">
            {loadError ? (
              <p className="py-8 text-center text-sm text-destructive">
                {loadError}
              </p>
            ) : (
              <>
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading image…
                  </div>
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={title}
                  className={cn(
                    "mx-auto max-h-[min(70vh,900px)] max-w-full object-contain",
                    loading && "opacity-0",
                  )}
                  onLoad={() => {
                    setLoading(false);
                    setLoadError(null);
                  }}
                  onError={() => {
                    setLoading(false);
                    setLoadError(
                      "Unable to load this image. Try downloading it instead.",
                    );
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
