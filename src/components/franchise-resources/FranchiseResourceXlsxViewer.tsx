"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Handsontable from "handsontable";
import type { GridSettings } from "handsontable/settings";
import { registerAllModules } from "handsontable/registry";
import { read } from "xlsx-js-style";
import { Loader2 } from "lucide-react";
import FranchiseResourceFileViewerHeader from "@/components/franchise-resources/FranchiseResourceFileViewerHeader";
import FranchiseResourceXlsxSheetSelect from "@/components/franchise-resources/FranchiseResourceXlsxSheetSelect";
import { useFranchiseResourceDocumentViewer } from "@/components/franchise-resources/FranchiseResourceDocumentViewerContext";
import {
  DOCUMENT_VIEWER_FRAME_CLASS,
  DOCUMENT_VIEWER_HUB_FRAME_CLASS,
  DOCUMENT_VIEWER_XLSX_SCROLL_TOUCH_CLASS,
} from "@/components/franchise-resources/document-viewer-layout";
import {
  useDocumentViewerMiddleMousePan,
  useDocumentViewerWheelChaining,
} from "@/components/franchise-resources/document-viewer-scroll";
import {
  parseWorkbookForHandsontable,
  type HandsontableSheet,
} from "@/components/franchise-resources/xlsx-sheet-parser";
import { cn } from "@/lib/utils";
import { getFileNameFromStoragePath } from "@/types/franchise-resources";

import "handsontable/styles/handsontable.css";
import "handsontable/styles/ht-theme-main.css";

registerAllModules();

type FranchiseResourceXlsxViewerProps = {
  url: string;
  title?: string;
  fillHeight?: boolean;
  externalBottomBar?: boolean;
};

const HOT_LICENSE_KEY = "non-commercial-and-evaluation";

type CellRendererFn = typeof Handsontable.renderers.TextRenderer;

function createStyledRenderer(style: CSSProperties): CellRendererFn {
  const styledRenderer: CellRendererFn = (
    instance,
    td,
    row,
    col,
    prop,
    value,
    cellProperties,
  ) => {
    Handsontable.renderers.TextRenderer(
      instance,
      td,
      row,
      col,
      prop,
      value,
      cellProperties,
    );
    Object.assign(td.style, style);
  };

  return styledRenderer;
}

function buildCellsFunction(
  cellStyles: Record<string, CSSProperties>,
): NonNullable<GridSettings["cells"]> {
  return function (row, col) {
    const style = cellStyles[`${row},${col}`];
    if (!style) {
      return { readOnly: true };
    }

    return {
      readOnly: true,
      renderer: createStyledRenderer(style),
    };
  };
}

export default function FranchiseResourceXlsxViewer({
  url,
  title = "Spreadsheet",
  fillHeight = false,
  externalBottomBar = false,
}: FranchiseResourceXlsxViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hotContainerRef = useRef<HTMLDivElement>(null);
  const hotInstanceRef = useRef<Handsontable | null>(null);
  const cellStylesRef = useRef<Record<string, CSSProperties>>({});

  const documentViewer = useFranchiseResourceDocumentViewer();
  const registerPdfCallbacks = documentViewer?.registerPdfCallbacks;
  const registerSheetPickerCallbacks = documentViewer?.registerSheetPickerCallbacks;
  const clearPdfViewer = documentViewer?.clearPdfViewer;
  const updatePdfPageState = documentViewer?.updatePdfPageState;
  const updateSheetPickerState = documentViewer?.updateSheetPickerState;
  const resetZoom = documentViewer?.resetZoom;
  const zoomScale = externalBottomBar ? (documentViewer?.zoomScale ?? 1) : 1;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheets, setSheets] = useState<HandsontableSheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const totalSheets = sheetNames.length;
  const currentSheet = totalSheets > 0 ? activeSheetIndex + 1 : 0;
  const activeSheet = sheets[activeSheetIndex];

  const currentSheetRef = useRef(currentSheet);
  currentSheetRef.current = currentSheet;

  useDocumentViewerWheelChaining(scrollContainerRef);
  useDocumentViewerMiddleMousePan(scrollContainerRef);

  useEffect(() => {
    resetZoom?.();
  }, [resetZoom, url]);

  useEffect(() => {
    let cancelled = false;

    async function loadSpreadsheet() {
      setLoading(true);
      setError(null);
      setSheetNames([]);
      setSheets([]);
      setActiveSheetIndex(0);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load spreadsheet (${response.status})`);
        }

        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const bytes = new Uint8Array(buffer);
        const workbook = read(bytes, {
          type: "array",
          cellDates: true,
          cellStyles: true,
        });
        const parsed = parseWorkbookForHandsontable(workbook, bytes);
        if (parsed.sheetNames.length === 0) {
          throw new Error("This spreadsheet has no worksheets.");
        }

        setSheetNames(parsed.sheetNames);
        setSheets(parsed.sheets);
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

  const applySheetToHot = useCallback(
    (sheet: HandsontableSheet | undefined) => {
      const hot = hotInstanceRef.current;
      if (!hot || !sheet) return;

      cellStylesRef.current = sheet.cellStyles;
      hot.updateSettings({
        data: sheet.data,
        mergeCells: sheet.mergeCells,
        colWidths: sheet.colWidths,
        cells: buildCellsFunction(sheet.cellStyles),
      });
      hot.render();
      hot.refreshDimensions();
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "auto" });
    },
    [],
  );

  useEffect(() => {
    if (loading || error || !hotContainerRef.current) return;

    const container = hotContainerRef.current;

    if (!hotInstanceRef.current) {
      hotInstanceRef.current = new Handsontable(container, {
        data: [],
        mergeCells: [],
        colWidths: [],
        cells: buildCellsFunction({}),
        readOnly: true,
        editor: false,
        readOnlyCellClassName: "",
        contextMenu: false,
        fillHandle: false,
        manualColumnResize: false,
        manualRowResize: false,
        stretchH: "none",
        autoColumnSize: false,
        autoRowSize: false,
        rowHeaders: false,
        colHeaders: false,
        licenseKey: HOT_LICENSE_KEY,
        themeName: "ht-theme-main",
        width: "100%",
        height: "auto",
        renderAllRows: true,
        preventOverflow: false,
        viewportRowRenderingOffset: "auto",
        viewportColumnRenderingOffset: "auto",
      });
    }

    return () => {
      hotInstanceRef.current?.destroy();
      hotInstanceRef.current = null;
    };
  }, [error, loading]);

  useEffect(() => {
    if (loading || error || sheets.length === 0) return;
    applySheetToHot(sheets[activeSheetIndex]);
  }, [activeSheetIndex, applySheetToHot, error, loading, sheets]);

  const goToSheet = useCallback(
    (sheetNumber: number) => {
      if (totalSheets <= 0) return;
      const nextIndex = Math.min(Math.max(sheetNumber, 1), totalSheets) - 1;
      setActiveSheetIndex(nextIndex);
    },
    [totalSheets],
  );

  const selectSheetByIndex = useCallback(
    (index: number) => {
      if (totalSheets <= 0) return;
      const nextIndex = Math.min(Math.max(index, 0), totalSheets - 1);
      setActiveSheetIndex(nextIndex);
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

  useEffect(() => {
    if (!externalBottomBar || !registerSheetPickerCallbacks) return;

    registerSheetPickerCallbacks({
      onSelectSheet: (index) => selectSheetByIndex(index),
    });

    return () => {
      registerSheetPickerCallbacks(null);
    };
  }, [externalBottomBar, registerSheetPickerCallbacks, selectSheetByIndex]);

  useEffect(() => {
    if (!externalBottomBar || !updateSheetPickerState) return;

    if (totalSheets <= 1) {
      updateSheetPickerState(null);
      return;
    }

    updateSheetPickerState({ sheetNames, activeSheetIndex });
  }, [
    activeSheetIndex,
    externalBottomBar,
    sheetNames,
    totalSheets,
    updateSheetPickerState,
  ]);

  const scrollClassName = DOCUMENT_VIEWER_XLSX_SCROLL_TOUCH_CLASS;

  const isEmptySheet =
    !activeSheet ||
    (activeSheet.data.length === 0 && activeSheet.mergeCells.length === 0);

  return (
    <div
      className={cn(
        DOCUMENT_VIEWER_FRAME_CLASS,
        "overflow-visible rounded-lg border border-border bg-card",
        fillHeight && DOCUMENT_VIEWER_HUB_FRAME_CLASS,
      )}
    >
      <FranchiseResourceFileViewerHeader
        title={title}
        downloadUrl={url}
        downloadFileName={getFileNameFromStoragePath(url)}
        externalBottomBar={externalBottomBar}
      />

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
          <div
            className="[&_.handsontable]:!text-inherit"
            style={{ zoom: zoomScale }}
          >
            {totalSheets > 0 ? (
              <div className="mb-2 flex flex-wrap items-center gap-2 px-2 sm:px-4 xl:px-4">
                <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                  Sheet:
                </span>
                {totalSheets > 1 ? (
                  <FranchiseResourceXlsxSheetSelect
                    sheetNames={sheetNames}
                    activeSheetIndex={activeSheetIndex}
                    onSelectSheet={selectSheetByIndex}
                  />
                ) : (
                  <span className="text-xs font-medium text-foreground sm:text-sm">
                    {sheetNames[activeSheetIndex]}
                  </span>
                )}
              </div>
            ) : null}

            <div
              ref={hotContainerRef}
              className={cn(
                "franchise-resource-xlsx-hot w-full",
                isEmptySheet && "hidden",
              )}
            />

            {isEmptySheet ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                This worksheet is empty.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
