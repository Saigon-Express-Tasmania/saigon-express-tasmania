"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { Loader2 } from "lucide-react";
import FranchiseResourceFileViewerHeader from "@/components/franchise-resources/FranchiseResourceFileViewerHeader";
import { useFranchiseResourceDocumentViewer } from "@/components/franchise-resources/FranchiseResourceDocumentViewerContext";
import {
  DOCUMENT_VIEWER_DOC_CLASS,
  DOCUMENT_VIEWER_FRAME_CLASS,
  DOCUMENT_VIEWER_HUB_FRAME_CLASS,
  DOCUMENT_VIEWER_SCROLL_FILL_TOUCH_CLASS,
  DOCUMENT_VIEWER_SCROLL_TOUCH_CLASS,
} from "@/components/franchise-resources/document-viewer-layout";
import { cn } from "@/lib/utils";
import { getFileNameFromStoragePath } from "@/types/franchise-resources";

type FranchiseResourceDocxViewerProps = {
  url: string;
  title?: string;
  fillHeight?: boolean;
  externalBottomBar?: boolean;
};

type DocxPageModel = {
  totalPages: number;
  pageOffsets: number[];
};

function getDocxSectionElements(container: HTMLElement): HTMLElement[] {
  const sections = container.querySelectorAll<HTMLElement>(
    ".docx-wrapper > section, .docx-wrapper > .docx",
  );
  if (sections.length > 0) {
    return Array.from(sections);
  }

  const wrapper = container.querySelector<HTMLElement>(".docx-wrapper");
  return wrapper ? [wrapper] : [];
}

function isWindowScrollRoot(root: HTMLElement): boolean {
  return root === document.documentElement || root === document.body;
}

function resolveScrollRoot(start: HTMLElement): HTMLElement {
  let node: HTMLElement | null = start;
  let fallback: HTMLElement = start;

  while (node) {
    const style = window.getComputedStyle(node);
    const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY);
    if (node.scrollHeight > node.clientHeight + 2) {
      fallback = node;
      if (canScrollY) {
        return node;
      }
    }
    node = node.parentElement;
  }

  if (document.documentElement.scrollHeight > window.innerHeight + 2) {
    return document.documentElement;
  }

  return fallback;
}

function getScrollTop(root: HTMLElement): number {
  return isWindowScrollRoot(root) ? window.scrollY : root.scrollTop;
}

function setScrollTop(
  root: HTMLElement,
  top: number,
  behavior: ScrollBehavior = "auto",
): void {
  if (isWindowScrollRoot(root)) {
    window.scrollTo({ top, behavior });
    return;
  }
  root.scrollTo({ top, behavior });
}

function getMaxScrollTop(root: HTMLElement): number {
  if (isWindowScrollRoot(root)) {
    return Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
  }
  return Math.max(0, root.scrollHeight - root.clientHeight);
}

function getOffsetTopWithinRoot(element: HTMLElement, root: HTMLElement): number {
  if (isWindowScrollRoot(root)) {
    return element.getBoundingClientRect().top + window.scrollY;
  }

  const rootRect = root.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return elementRect.top - rootRect.top + root.scrollTop;
}

function readSectionPageHeight(section: HTMLElement): number {
  const computed = window.getComputedStyle(section);
  for (const value of [computed.minHeight, computed.height]) {
    const parsed = Number.parseFloat(value);
    if (parsed > 100 && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function buildDocxPageModel(
  container: HTMLElement,
  scrollRoot: HTMLElement,
): DocxPageModel | null {
  const sections = getDocxSectionElements(container);
  if (sections.length === 0) return null;

  if (sections.length > 1) {
    const pageOffsets = sections.map((section) =>
      getOffsetTopWithinRoot(section, scrollRoot),
    );
    return {
      totalPages: sections.length,
      pageOffsets,
    };
  }

  const content = sections[0];
  const maxScrollTop = getMaxScrollTop(scrollRoot);
  if (maxScrollTop <= 0) {
    return { totalPages: 1, pageOffsets: [0] };
  }

  const sectionPageHeight = readSectionPageHeight(content);
  const viewportPageHeight = isWindowScrollRoot(scrollRoot)
    ? window.innerHeight
    : scrollRoot.clientHeight;
  const pageHeight = Math.max(
    320,
    sectionPageHeight || 0,
    Math.floor(viewportPageHeight * 0.92),
  );

  const contentBottom = getOffsetTopWithinRoot(content, scrollRoot) + content.offsetHeight;
  const scrollableSpan = Math.max(maxScrollTop, contentBottom - pageHeight);
  const totalPages = Math.max(1, Math.floor(scrollableSpan / pageHeight) + 1);
  const pageOffsets = Array.from({ length: totalPages }, (_, index) =>
    Math.min(index * pageHeight, maxScrollTop),
  );

  return { totalPages, pageOffsets };
}

function pageFromScrollTop(model: DocxPageModel, scrollTop: number): number {
  let page = 1;
  for (let index = 0; index < model.pageOffsets.length; index += 1) {
    if (scrollTop + 8 >= model.pageOffsets[index]) {
      page = index + 1;
    }
  }
  return page;
}

export default function FranchiseResourceDocxViewer({
  url,
  title = "Document",
  fillHeight = false,
  externalBottomBar = false,
}: FranchiseResourceDocxViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRootRef = useRef<HTMLElement | null>(null);
  const pageModelRef = useRef<DocxPageModel | null>(null);
  const documentViewer = useFranchiseResourceDocumentViewer();
  const registerPdfCallbacks = documentViewer?.registerPdfCallbacks;
  const clearPdfViewer = documentViewer?.clearPdfViewer;
  const updatePdfPageState = documentViewer?.updatePdfPageState;
  const resetZoom = documentViewer?.resetZoom;
  const zoomScale = externalBottomBar ? (documentViewer?.zoomScale ?? 1) : 1;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  useEffect(() => {
    resetZoom?.();
  }, [resetZoom, url]);

  const rebuildPageModel = useCallback((resetToFirstPage: boolean) => {
    const container = containerRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!container || !scrollContainer) {
      pageModelRef.current = null;
      scrollRootRef.current = null;
      setNumPages(0);
      return;
    }

    const scrollRoot = resolveScrollRoot(scrollContainer);
    scrollRootRef.current = scrollRoot;

    const model = buildDocxPageModel(container, scrollRoot);
    pageModelRef.current = model;
    setNumPages(model?.totalPages ?? 0);

    if (!model) return;

    const nextPage = resetToFirstPage
      ? 1
      : Math.min(Math.max(currentPageRef.current, 1), model.totalPages);

    setCurrentPage(nextPage);
    if (resetToFirstPage) {
      setScrollTop(scrollRoot, model.pageOffsets[nextPage - 1] ?? 0);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    async function loadDocument() {
      setLoading(true);
      setError(null);
      setNumPages(0);
      setCurrentPage(1);
      pageModelRef.current = null;
      scrollRootRef.current = null;
      if (container) container.innerHTML = "";

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load document (${response.status})`);
        }

        const blob = await response.blob();
        if (cancelled || !containerRef.current) return;

        await renderAsync(blob, containerRef.current, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
        });

        if (cancelled) return;

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (cancelled) return;
            rebuildPageModel(true);
          });
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this document. Try downloading it instead.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
      if (container) container.innerHTML = "";
    };
  }, [rebuildPageModel, url]);

  const scrollToPage = useCallback(
    (page: number, behavior: ScrollBehavior = "smooth") => {
      const scrollRoot = scrollRootRef.current;
      const model = pageModelRef.current;
      if (!scrollRoot || !model || model.totalPages <= 0) return;

      const safePage = Math.min(Math.max(page, 1), model.totalPages);
      const scrollTop = model.pageOffsets[safePage - 1] ?? 0;

      setCurrentPage(safePage);
      setScrollTop(scrollRoot, scrollTop, behavior);
    },
    [],
  );

  const scrollToPageRef = useRef(scrollToPage);
  scrollToPageRef.current = scrollToPage;

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
    if (numPages <= 0) return;

    const handleScroll = () => {
      const activeModel = pageModelRef.current;
      const activeRoot = scrollRootRef.current;
      if (!activeModel || !activeRoot) return;
      setCurrentPage(pageFromScrollTop(activeModel, getScrollTop(activeRoot)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    const scrollContainer = scrollContainerRef.current;
    scrollContainer?.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      scrollContainer?.removeEventListener("scroll", handleScroll);
    };
  }, [numPages]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const contentContainer = containerRef.current;
    if (!scrollContainer || !contentContainer || loading) return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        rebuildPageModel(false);
      });
    });

    observer.observe(scrollContainer);
    observer.observe(contentContainer);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [loading, rebuildPageModel, zoomScale]);

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
      />
      <div ref={scrollContainerRef} className={cn(scrollClassName, "relative")}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading document…
          </div>
        ) : null}
        {error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : null}
        <div
          ref={containerRef}
          className={cn(DOCUMENT_VIEWER_DOC_CLASS, "docx-viewer", loading && "hidden")}
          style={{ zoom: zoomScale }}
        />
      </div>
    </div>
  );
}
