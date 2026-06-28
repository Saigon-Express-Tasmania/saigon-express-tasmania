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

type FranchiseResourceTextViewerProps = {
  url: string;
  title?: string;
  fillHeight?: boolean;
  externalBottomBar?: boolean;
};

export default function FranchiseResourceTextViewer({
  url,
  title = "Document",
  fillHeight = false,
  externalBottomBar = false,
}: FranchiseResourceTextViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setLoadError(null);
    setContent(null);

    void (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        if (!cancelled) {
          setContent(text);
        }
      } catch {
        if (cancelled || controller.signal.aborted) return;
        setLoadError(
          "Unable to load this text file. Try downloading it instead.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
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
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading text file…
            </div>
          ) : loadError ? (
            <p className="py-8 text-center text-sm text-destructive">
              {loadError}
            </p>
          ) : (
            <pre className="max-w-full whitespace-pre-wrap break-words rounded-md bg-card p-3 font-mono text-xs leading-relaxed text-foreground sm:p-4 sm:text-sm">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
