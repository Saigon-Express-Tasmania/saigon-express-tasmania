"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2 } from "lucide-react";
import FranchiseResourceFileViewerHeader from "@/components/franchise-resources/FranchiseResourceFileViewerHeader";
import FranchiseResourcePdfPageNav from "@/components/franchise-resources/FranchiseResourcePdfPageNav";
import { useFranchiseResourceDocumentViewer } from "@/components/franchise-resources/FranchiseResourceDocumentViewerContext";
import {
  DOCUMENT_VIEWER_FRAME_CLASS,
  DOCUMENT_VIEWER_HUB_FRAME_CLASS,
  DOCUMENT_VIEWER_PAGE_CLASS,
  DOCUMENT_VIEWER_SCROLL_FILL_TOUCH_CLASS,
  DOCUMENT_VIEWER_SCROLL_TOUCH_CLASS,
} from "@/components/franchise-resources/document-viewer-layout";
import { cn } from "@/lib/utils";
import { getFileNameFromStoragePath } from "@/types/franchise-resources";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type FranchiseResourcePdfViewerProps = {
  url: string;
  title?: string;
  fillHeight?: boolean;
  /** Hides the in-viewer toolbar; page controls are shown in the document bottom bar. */
  externalBottomBar?: boolean;
};

function measurePageWidth(container: HTMLElement): number {
  const styles = window.getComputedStyle(container);
  const horizontalPadding =
    Number.parseFloat(styles.paddingLeft) +
    Number.parseFloat(styles.paddingRight);
  return Math.max(200, Math.floor(container.clientWidth - horizontalPadding));
}

export default function FranchiseResourcePdfViewer({
  url,
  title = "Document",
  fillHeight = false,
  externalBottomBar = false,
}: FranchiseResourcePdfViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const documentViewer = useFranchiseResourceDocumentViewer();
  const registerPdfCallbacks = documentViewer?.registerPdfCallbacks;
  const clearPdfViewer = documentViewer?.clearPdfViewer;
  const updatePdfPageState = documentViewer?.updatePdfPageState;
  const resetZoom = documentViewer?.resetZoom;
  const zoomScale = externalBottomBar ? (documentViewer?.zoomScale ?? 1) : 1;
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [basePageWidth, setBasePageWidth] = useState(320);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pageWidth = Math.round(basePageWidth * zoomScale);

  useEffect(() => {
    setNumPages(0);
    setCurrentPage(1);
    setLoadError(null);
    pageRefs.current.clear();
    resetZoom?.();
  }, [resetZoom, url]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setBasePageWidth(measurePageWidth(container));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, [fillHeight, numPages]);

  const scrollToPage = useCallback(
    (page: number, behavior: ScrollBehavior = "smooth") => {
      const safePage = Math.min(Math.max(page, 1), numPages || 1);
      const target = pageRefs.current.get(safePage);
      if (!target) return;

      setCurrentPage(safePage);
      target.scrollIntoView({ behavior, block: "start" });
    },
    [numPages],
  );

  const scrollToPageRef = useRef(scrollToPage);
  scrollToPageRef.current = scrollToPage;

  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  useEffect(() => {
    if (!externalBottomBar || !registerPdfCallbacks || !clearPdfViewer) return;

    registerPdfCallbacks({
      onPrevious: () =>
        scrollToPageRef.current(currentPageRef.current - 1),
      onNext: () => scrollToPageRef.current(currentPageRef.current + 1),
      onGoToPage: (page) => scrollToPageRef.current(page),
    });

    return () => {
      clearPdfViewer();
    };
  }, [clearPdfViewer, externalBottomBar, registerPdfCallbacks]);

  useEffect(() => {
    if (!externalBottomBar || !updatePdfPageState) return;
    updatePdfPageState(currentPage, numPages);
  }, [currentPage, externalBottomBar, numPages, updatePdfPageState]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || numPages <= 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const top = visible[0];
        if (!top) return;

        const page = Number.parseInt(
          (top.target as HTMLElement).dataset.pageNumber ?? "",
          10,
        );
        if (!Number.isNaN(page)) {
          setCurrentPage(page);
        }
      },
      {
        root: container,
        threshold: [0.2, 0.45, 0.7],
      },
    );

    const frame = requestAnimationFrame(() => {
      for (const element of pageRefs.current.values()) {
        observer.observe(element);
      }
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [numPages, pageWidth, zoomScale]);

  const pageNumbers = useMemo(
    () => Array.from({ length: numPages }, (_, index) => index + 1),
    [numPages],
  );

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
      >
        {!externalBottomBar ? (
          <FranchiseResourcePdfPageNav
            currentPage={currentPage}
            totalPages={numPages}
            onPrevious={() => scrollToPage(currentPage - 1)}
            onNext={() => scrollToPage(currentPage + 1)}
            onGoToPage={(page) => scrollToPage(page)}
          />
        ) : null}
      </FranchiseResourceFileViewerHeader>

      <div
        className={cn(
          "flex min-h-0 flex-col",
          fillHeight ? "min-h-0 flex-1" : "",
        )}
      >
        <div ref={scrollContainerRef} className={cn(scrollClassName, "min-h-0")}>
          {loadError ? (
            <p className="py-8 text-center text-sm text-destructive">{loadError}</p>
          ) : (
            <Document
              file={url}
              loading={
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading PDF…
                </div>
              }
              onLoadSuccess={({ numPages: total }) => {
                setNumPages(total);
                setCurrentPage(1);
              }}
              onLoadError={() => {
                setLoadError("Unable to load this PDF. Try downloading it instead.");
              }}
              className="flex w-full min-w-0 flex-col items-center gap-3 sm:gap-4"
            >
              {pageNumbers.map((pageNumber) => (
                <div
                  key={pageNumber}
                  ref={(element) => {
                    if (element) {
                      pageRefs.current.set(pageNumber, element);
                    } else {
                      pageRefs.current.delete(pageNumber);
                    }
                  }}
                  data-page-number={pageNumber}
                  className="w-full max-w-full scroll-mt-2"
                >
                  <Page
                    pageNumber={pageNumber}
                    width={pageWidth}
                    renderTextLayer
                    renderAnnotationLayer
                    className={DOCUMENT_VIEWER_PAGE_CLASS}
                  />
                </div>
              ))}
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}
