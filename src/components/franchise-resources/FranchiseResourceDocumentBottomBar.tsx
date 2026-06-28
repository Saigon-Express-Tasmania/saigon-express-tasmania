"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import FranchiseResourceDocumentZoomNav from "@/components/franchise-resources/FranchiseResourceDocumentZoomNav";
import FranchiseResourcePdfPageNav from "@/components/franchise-resources/FranchiseResourcePdfPageNav";
import FranchiseResourceXlsxSheetSelect from "@/components/franchise-resources/FranchiseResourceXlsxSheetSelect";
import { useFranchiseResourceDocumentViewer } from "@/components/franchise-resources/FranchiseResourceDocumentViewerContext";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { downloadFranchiseResourceFile } from "@/lib/franchise-resource-file-download";
import {
  resolveFranchiseResourceFileUrl,
} from "@/types/franchise-resources";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FranchiseResourceDocumentBottomBarProps = {
  documentTitle: string;
  contentFile?: string | null;
  fileName?: string | null;
  showPagination?: boolean;
  showZoom?: boolean;
};

function BottomBarContent({
  documentTitle,
  contentFile,
  fileName,
  showPagination,
  showZoom = false,
}: FranchiseResourceDocumentBottomBarProps) {
  const viewer = useFranchiseResourceDocumentViewer();
  const { getPublicUrl } = useSupabaseStorage();
  const pdfPageState = viewer?.pdfPageState ?? null;
  const sheetPickerState = viewer?.sheetPickerState ?? null;
  const trimmedFileName = fileName?.trim() ?? "";
  const hasControls = showZoom || showPagination;
  const [downloading, setDownloading] = useState(false);

  const downloadUrl = useMemo(() => {
    const path = contentFile?.trim() ?? "";
    if (!path) return "";
    return resolveFranchiseResourceFileUrl(path, getPublicUrl);
  }, [contentFile, getPublicUrl]);

  const canDownload = Boolean(downloadUrl && trimmedFileName);

  async function handleFileNameDownload() {
    if (!canDownload || downloading) return;
    setDownloading(true);
    try {
      await downloadFranchiseResourceFile(downloadUrl, trimmedFileName);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="Document controls"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center sm:px-4 sm:pb-4"
    >
      <div className="pointer-events-auto flex w-full items-center gap-2 border-2 border-red-500 bg-card/95 px-3 py-2.5 shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.18)] backdrop-blur-md supports-[backdrop-filter]:bg-card/90 max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:w-auto sm:min-w-[min(100%,42rem)] sm:max-w-3xl sm:gap-3 sm:rounded-xl sm:px-4 sm:py-3 sm:shadow-xl">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground sm:h-9 sm:w-9">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "flex min-w-0 items-center gap-2",
                sheetPickerState && "max-sm:w-full",
              )}
            >
              <p
                className={cn(
                  "min-w-0 flex-1 truncate text-xs font-semibold leading-tight text-foreground sm:text-sm",
                  sheetPickerState && "hidden sm:block",
                )}
              >
                {documentTitle}
              </p>
              {sheetPickerState ? (
                <FranchiseResourceXlsxSheetSelect
                  variant="compact"
                  sheetNames={sheetPickerState.sheetNames}
                  activeSheetIndex={sheetPickerState.activeSheetIndex}
                  onSelectSheet={viewer?.onSelectSheet ?? (() => {})}
                  className="w-full max-w-none sm:h-8 sm:w-auto sm:max-w-[10rem] sm:shrink-0"
                />
              ) : null}
            </div>
            {trimmedFileName ? (
              canDownload ? (
                <button
                  type="button"
                  onClick={() => void handleFileNameDownload()}
                  disabled={downloading}
                  className="flex min-w-0 max-w-full items-center gap-1 truncate text-left text-[11px] text-primary underline underline-offset-2 transition-colors hover:text-primary/80 disabled:opacity-60 sm:text-xs"
                  title={`Download ${trimmedFileName}`}
                >
                  {downloading ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                  ) : null}
                  <span className="truncate">{trimmedFileName}</span>
                </button>
              ) : (
                <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                  {trimmedFileName}
                </p>
              )
            ) : null}
          </div>
        </div>

        {hasControls ? (
          <div className="ml-auto flex shrink-0 items-center gap-2 border-l border-border/80 pl-2 sm:gap-3 sm:pl-3">
            {showZoom ? (
              <FranchiseResourceDocumentZoomNav
                scale={viewer?.zoomScale ?? 1}
                onZoomIn={viewer?.zoomIn ?? (() => {})}
                onZoomOut={viewer?.zoomOut ?? (() => {})}
              />
            ) : null}

            {showZoom && showPagination ? (
              <div className="h-6 w-px shrink-0 bg-border/80" aria-hidden />
            ) : null}

            {showPagination ? (
              <FranchiseResourcePdfPageNav
                variant="bottomBar"
                currentPage={pdfPageState?.currentPage ?? 1}
                totalPages={pdfPageState?.totalPages ?? 0}
                onPrevious={viewer?.onPrevious ?? (() => {})}
                onNext={viewer?.onNext ?? (() => {})}
                onGoToPage={viewer?.onGoToPage ?? (() => {})}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function FranchiseResourceDocumentBottomBar(
  props: FranchiseResourceDocumentBottomBarProps,
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(<BottomBarContent {...props} />, document.body);
}
