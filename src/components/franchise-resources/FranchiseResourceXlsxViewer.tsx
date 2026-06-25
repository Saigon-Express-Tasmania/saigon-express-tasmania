"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { read, utils, type WorkBook } from "xlsx";
import { Loader2 } from "lucide-react";
import FranchiseResourceFileViewerHeader from "@/components/franchise-resources/FranchiseResourceFileViewerHeader";
import { useFranchiseResourceDocumentViewer } from "@/components/franchise-resources/FranchiseResourceDocumentViewerContext";
import {
  DOCUMENT_VIEWER_FRAME_CLASS,
  DOCUMENT_VIEWER_HUB_FRAME_CLASS,
  DOCUMENT_VIEWER_SCROLL_FILL_TOUCH_CLASS,
  DOCUMENT_VIEWER_SCROLL_TOUCH_CLASS,
  DOCUMENT_VIEWER_TABLE_CLASS,
} from "@/components/franchise-resources/document-viewer-layout";
import { cn } from "@/lib/utils";
import { getFileNameFromStoragePath } from "@/types/franchise-resources";

type FranchiseResourceXlsxViewerProps = {
  url: string;
  title?: string;
  fillHeight?: boolean;
  externalBottomBar?: boolean;
};

type ParsedWorkbook = {
  sheetNames: string[];
  rowsBySheet: string[][][];
};

function formatCellValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toLocaleString("en-AU");
  }
  return String(value);
}

function parseWorkbook(workbook: WorkBook): ParsedWorkbook {
  const sheetNames = workbook.SheetNames;
  const rowsBySheet = sheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];

    const rawRows = utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (rawRows.length === 0) return [];

    const maxCols = rawRows.reduce(
      (max, row) => Math.max(max, Array.isArray(row) ? row.length : 0),
      0,
    );

    return rawRows.map((row) =>
      Array.from({ length: maxCols }, (_, index) =>
        formatCellValue(Array.isArray(row) ? row[index] : ""),
      ),
    );
  });

  return { sheetNames, rowsBySheet };
}

export default function FranchiseResourceXlsxViewer({
  url,
  title = "Spreadsheet",
  fillHeight = false,
  externalBottomBar = false,
}: FranchiseResourceXlsxViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const documentViewer = useFranchiseResourceDocumentViewer();
  const registerPdfCallbacks = documentViewer?.registerPdfCallbacks;
  const clearPdfViewer = documentViewer?.clearPdfViewer;
  const updatePdfPageState = documentViewer?.updatePdfPageState;
  const resetZoom = documentViewer?.resetZoom;
  const zoomScale = externalBottomBar ? (documentViewer?.zoomScale ?? 1) : 1;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [rowsBySheet, setRowsBySheet] = useState<string[][][]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const totalSheets = sheetNames.length;
  const currentSheet = totalSheets > 0 ? activeSheetIndex + 1 : 0;
  const activeRows = rowsBySheet[activeSheetIndex] ?? [];

  const currentSheetRef = useRef(currentSheet);
  currentSheetRef.current = currentSheet;

  useEffect(() => {
    resetZoom?.();
  }, [resetZoom, url]);

  useEffect(() => {
    let cancelled = false;

    async function loadSpreadsheet() {
      setLoading(true);
      setError(null);
      setSheetNames([]);
      setRowsBySheet([]);
      setActiveSheetIndex(0);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load spreadsheet (${response.status})`);
        }

        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const workbook = read(buffer, { type: "array", cellDates: true });
        const parsed = parseWorkbook(workbook);
        if (parsed.sheetNames.length === 0) {
          throw new Error("This spreadsheet has no worksheets.");
        }

        setSheetNames(parsed.sheetNames);
        setRowsBySheet(parsed.rowsBySheet);
        setActiveSheetIndex(0);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this spreadsheet. Try downloading it instead.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSpreadsheet();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const goToSheet = useCallback(
    (sheetNumber: number) => {
      if (totalSheets <= 0) return;
      const nextIndex = Math.min(Math.max(sheetNumber, 1), totalSheets) - 1;
      setActiveSheetIndex(nextIndex);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [totalSheets],
  );

  const goToSheetRef = useRef(goToSheet);
  goToSheetRef.current = goToSheet;

  useEffect(() => {
    if (!externalBottomBar || !registerPdfCallbacks || !clearPdfViewer) return;

    registerPdfCallbacks({
      onPrevious: () => goToSheetRef.current(currentSheetRef.current - 1),
      onNext: () => goToSheetRef.current(currentSheetRef.current + 1),
      onGoToPage: (page) => goToSheetRef.current(page),
    });

    return () => {
      clearPdfViewer();
    };
  }, [clearPdfViewer, externalBottomBar, registerPdfCallbacks]);

  useEffect(() => {
    if (!externalBottomBar || !updatePdfPageState) return;
    updatePdfPageState(currentSheet, totalSheets);
  }, [currentSheet, externalBottomBar, totalSheets, updatePdfPageState]);

  const scrollClassName = fillHeight
    ? DOCUMENT_VIEWER_SCROLL_FILL_TOUCH_CLASS
    : DOCUMENT_VIEWER_SCROLL_TOUCH_CLASS;

  return (
    <div
      className={cn(
        DOCUMENT_VIEWER_FRAME_CLASS,
        "rounded-lg border border-border bg-card",
        fillHeight && "min-h-0 flex-1",
        fillHeight && DOCUMENT_VIEWER_HUB_FRAME_CLASS,
      )}
    >
      <FranchiseResourceFileViewerHeader
        title={title}
        downloadUrl={url}
        downloadFileName={getFileNameFromStoragePath(url)}
        externalBottomBar={externalBottomBar}
        className={
          !externalBottomBar && totalSheets > 1
            ? "flex-col items-stretch gap-2 sm:flex-row sm:items-center"
            : undefined
        }
      >
        {!externalBottomBar && totalSheets > 1 ? (
          <div className="flex max-w-full gap-1 overflow-x-auto scrollbar-hide pb-0.5">
            {sheetNames.map((name, index) => (
              <button
                key={`${name}-${index}`}
                type="button"
                onClick={() => goToSheet(index + 1)}
                className={cn(
                  "shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  index === activeSheetIndex
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
      </FranchiseResourceFileViewerHeader>

      <div ref={scrollContainerRef} className={cn(scrollClassName, "relative")}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading spreadsheet…
          </div>
        ) : null}

        {error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : null}

        {!loading && !error ? (
          <div className="max-xl:min-w-max" style={{ zoom: zoomScale }}>
            {totalSheets > 0 ? (
              <p className="mb-2 text-xs font-medium text-muted-foreground sm:text-sm">
                Sheet: {sheetNames[activeSheetIndex]}
                {totalSheets > 1 ? (
                  <span className="text-muted-foreground/80">
                    {" "}
                    ({activeSheetIndex + 1} of {totalSheets})
                  </span>
                ) : null}
              </p>
            ) : null}

            {activeRows.length > 0 ? (
              <table className={DOCUMENT_VIEWER_TABLE_CLASS}>
                  <tbody>
                    {activeRows.map((row, rowIndex) => (
                      <tr key={`${activeSheetIndex}-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                This worksheet is empty.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
