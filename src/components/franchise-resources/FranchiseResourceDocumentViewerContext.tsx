"use client";

import {
  clampFranchiseResourceViewerZoom,
  FRANCHISE_RESOURCE_VIEWER_ZOOM_STEP,
} from "@/components/franchise-resources/franchise-resource-viewer-zoom";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type FranchiseResourcePdfPageState = {
  currentPage: number;
  totalPages: number;
};

export type FranchiseResourceSheetPickerState = {
  sheetNames: string[];
  activeSheetIndex: number;
};

type FranchiseResourcePdfCallbacks = {
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
};

type FranchiseResourceSheetPickerCallbacks = {
  onSelectSheet: (index: number) => void;
};

type FranchiseResourceDocumentViewerContextValue = {
  pdfPageState: FranchiseResourcePdfPageState | null;
  sheetPickerState: FranchiseResourceSheetPickerState | null;
  zoomScale: number;
  registerPdfCallbacks: (callbacks: FranchiseResourcePdfCallbacks | null) => void;
  registerSheetPickerCallbacks: (
    callbacks: FranchiseResourceSheetPickerCallbacks | null,
  ) => void;
  updatePdfPageState: (currentPage: number, totalPages: number) => void;
  updateSheetPickerState: (state: FranchiseResourceSheetPickerState | null) => void;
  clearPdfViewer: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
  onSelectSheet: (index: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

const FranchiseResourceDocumentViewerContext =
  createContext<FranchiseResourceDocumentViewerContextValue | null>(null);

export function FranchiseResourceDocumentViewerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pdfCallbacksRef = useRef<FranchiseResourcePdfCallbacks | null>(null);
  const sheetPickerCallbacksRef =
    useRef<FranchiseResourceSheetPickerCallbacks | null>(null);
  const [pdfPageState, setPdfPageState] =
    useState<FranchiseResourcePdfPageState | null>(null);
  const [sheetPickerState, setSheetPickerState] =
    useState<FranchiseResourceSheetPickerState | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const registerPdfCallbacks = useCallback(
    (callbacks: FranchiseResourcePdfCallbacks | null) => {
      pdfCallbacksRef.current = callbacks;
    },
    [],
  );

  const registerSheetPickerCallbacks = useCallback(
    (callbacks: FranchiseResourceSheetPickerCallbacks | null) => {
      sheetPickerCallbacksRef.current = callbacks;
    },
    [],
  );

  const updatePdfPageState = useCallback(
    (currentPage: number, totalPages: number) => {
      setPdfPageState((previous) => {
        if (
          previous?.currentPage === currentPage &&
          previous?.totalPages === totalPages
        ) {
          return previous;
        }
        return { currentPage, totalPages };
      });
    },
    [],
  );

  const updateSheetPickerState = useCallback(
    (state: FranchiseResourceSheetPickerState | null) => {
      setSheetPickerState((previous) => {
        if (state === null) {
          return previous === null ? previous : null;
        }
        if (
          previous?.activeSheetIndex === state.activeSheetIndex &&
          previous.sheetNames === state.sheetNames
        ) {
          return previous;
        }
        return state;
      });
    },
    [],
  );

  const resetZoom = useCallback(() => {
    setZoomScale(1);
  }, []);

  const clearPdfViewer = useCallback(() => {
    pdfCallbacksRef.current = null;
    sheetPickerCallbacksRef.current = null;
    setPdfPageState(null);
    setSheetPickerState(null);
    setZoomScale(1);
  }, []);

  const zoomIn = useCallback(() => {
    setZoomScale((previous) =>
      clampFranchiseResourceViewerZoom(previous + FRANCHISE_RESOURCE_VIEWER_ZOOM_STEP),
    );
  }, []);

  const zoomOut = useCallback(() => {
    setZoomScale((previous) =>
      clampFranchiseResourceViewerZoom(previous - FRANCHISE_RESOURCE_VIEWER_ZOOM_STEP),
    );
  }, []);

  const onPrevious = useCallback(() => {
    pdfCallbacksRef.current?.onPrevious();
  }, []);

  const onNext = useCallback(() => {
    pdfCallbacksRef.current?.onNext();
  }, []);

  const onGoToPage = useCallback((page: number) => {
    pdfCallbacksRef.current?.onGoToPage(page);
  }, []);

  const onSelectSheet = useCallback((index: number) => {
    sheetPickerCallbacksRef.current?.onSelectSheet(index);
  }, []);

  const value = useMemo(
    () => ({
      pdfPageState,
      sheetPickerState,
      zoomScale,
      registerPdfCallbacks,
      registerSheetPickerCallbacks,
      updatePdfPageState,
      updateSheetPickerState,
      clearPdfViewer,
      onPrevious,
      onNext,
      onGoToPage,
      onSelectSheet,
      zoomIn,
      zoomOut,
      resetZoom,
    }),
    [
      pdfPageState,
      sheetPickerState,
      zoomScale,
      registerPdfCallbacks,
      registerSheetPickerCallbacks,
      updatePdfPageState,
      updateSheetPickerState,
      clearPdfViewer,
      onPrevious,
      onNext,
      onGoToPage,
      onSelectSheet,
      zoomIn,
      zoomOut,
      resetZoom,
    ],
  );

  return (
    <FranchiseResourceDocumentViewerContext.Provider value={value}>
      {children}
    </FranchiseResourceDocumentViewerContext.Provider>
  );
}

export function useFranchiseResourceDocumentViewer() {
  return useContext(FranchiseResourceDocumentViewerContext);
}
