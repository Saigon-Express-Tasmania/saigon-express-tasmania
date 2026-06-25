/** Shared layout classes for in-page document viewers (PDF, DOCX). */

export const DOCUMENT_VIEWER_FRAME_CLASS =
  "flex w-full min-w-0 flex-col overflow-hidden";

/** Hub embed below xl: file preview bleeds to card edges. */
export const DOCUMENT_VIEWER_HUB_FRAME_CLASS =
  "max-xl:rounded-none max-xl:border-x-0";

/** Horizontal touch scroll on smaller screens; scrollbar hidden until xl. */
export const DOCUMENT_VIEWER_TOUCH_SCROLL_X_CLASS =
  "overflow-x-auto max-xl:scrollbar-hide-x xl:overflow-x-hidden";

export const DOCUMENT_VIEWER_HEADER_CLASS =
  "flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 text-sm sm:px-4";

/** Fixed max-height scroll region (standalone / default layout). */
export const DOCUMENT_VIEWER_SCROLL_CLASS =
  "w-full min-w-0 max-h-[min(50dvh,800px)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-auto p-2 sm:max-h-[min(65vh,800px)] sm:p-4 lg:max-h-[min(70vh,800px)]";

/** Fills remaining flex space (hub layout on mobile). */
export const DOCUMENT_VIEWER_SCROLL_FILL_CLASS =
  "w-full min-w-0 flex-1 min-h-[min(240px,45dvh)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-auto p-0 sm:min-h-[320px] xl:p-4";

export const DOCUMENT_VIEWER_SCROLL_TOUCH_CLASS = `${DOCUMENT_VIEWER_SCROLL_CLASS} ${DOCUMENT_VIEWER_TOUCH_SCROLL_X_CLASS}`;

export const DOCUMENT_VIEWER_SCROLL_FILL_TOUCH_CLASS = `${DOCUMENT_VIEWER_SCROLL_FILL_CLASS} ${DOCUMENT_VIEWER_TOUCH_SCROLL_X_CLASS}`;

export const DOCUMENT_VIEWER_PAGE_CLASS =
  "max-w-full shadow-sm [&_canvas]:!h-auto [&_canvas]:max-w-full";

export const DOCUMENT_VIEWER_DOC_CLASS =
  "max-xl:min-w-max max-xl:w-max max-w-full [&_.docx-wrapper]:max-w-full [&_.docx-wrapper]:!w-full max-xl:[&_.docx-wrapper]:!w-max max-xl:[&_.docx-wrapper]:!max-w-none";

export const DOCUMENT_VIEWER_TABLE_CLASS =
  "w-full min-w-max border-collapse text-left text-xs sm:text-sm [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_td]:whitespace-pre-wrap [&_tr:nth-child(even)]:bg-muted/20";
