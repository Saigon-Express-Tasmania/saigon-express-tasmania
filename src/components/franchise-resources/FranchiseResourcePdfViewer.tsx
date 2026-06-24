"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type FranchiseResourcePdfViewerProps = {
  url: string;
  title?: string;
};

export default function FranchiseResourcePdfViewer({
  url,
  title = "Document",
}: FranchiseResourcePdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setNumPages(0);
    setPageNumber(1);
    setLoadError(null);
  }, [url]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 text-sm">
        <span className="truncate font-medium text-foreground">{title}</span>
        {numPages > 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <button
              type="button"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
              className="rounded p-1 transition-colors hover:bg-secondary disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {pageNumber} / {numPages}
            </span>
            <button
              type="button"
              disabled={pageNumber >= numPages}
              onClick={() =>
                setPageNumber((current) => Math.min(numPages, current + 1))
              }
              className="rounded p-1 transition-colors hover:bg-secondary disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex justify-center overflow-x-auto p-4">
        {loadError ? (
          <p className="py-8 text-sm text-destructive">{loadError}</p>
        ) : (
          <Document
            file={url}
            loading={
              <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading PDF…
              </div>
            }
            onLoadSuccess={({ numPages: total }) => {
              setNumPages(total);
              setPageNumber(1);
            }}
            onLoadError={() => {
              setLoadError("Unable to load this PDF. Try downloading it instead.");
            }}
          >
            <Page
              pageNumber={pageNumber}
              width={Math.min(760, typeof window !== "undefined" ? window.innerWidth - 80 : 760)}
              renderTextLayer
              renderAnnotationLayer
            />
          </Document>
        )}
      </div>
    </div>
  );
}
