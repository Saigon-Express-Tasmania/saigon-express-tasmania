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

type FranchiseResourcePdfCallbacks = {
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
};

type FranchiseResourceDocumentViewerContextValue = {
  pdfPageState: FranchiseResourcePdfPageState | null;
  zoomScale: number;
  registerPdfCallbacks: (callbacks: FranchiseResourcePdfCallbacks | null) => void;
  updatePdfPageState: (currentPage: number, totalPages: number) => void;
  clearPdfViewer: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
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
  const [pdfPageState, setPdfPageState] =
    useState<FranchiseResourcePdfPageState | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const registerPdfCallbacks = useCallback(
    (callbacks: FranchiseResourcePdfCallbacks | null) => {
      pdfCallbacksRef.current = callbacks;
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

  const resetZoom = useCallback(() => {
    setZoomScale(1);
  }, []);

  const clearPdfViewer = useCallback(() => {
    pdfCallbacksRef.current = null;
    setPdfPageState(null);
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

  const value = useMemo(
    () => ({
      pdfPageState,
      zoomScale,
      registerPdfCallbacks,
      updatePdfPageState,
      clearPdfViewer,
      onPrevious,
      onNext,
      onGoToPage,
      zoomIn,
      zoomOut,
      resetZoom,
    }),
    [
      pdfPageState,
      zoomScale,
      registerPdfCallbacks,
      updatePdfPageState,
      clearPdfViewer,
      onPrevious,
      onNext,
      onGoToPage,
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
