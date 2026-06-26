import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  buildEmailPreviewSrcDoc,
  DEFAULT_PREVIEW_HIGHLIGHT_COLOR,
  isPreviewHighlightDisabled,
  PREVIEW_HIGHLIGHT_TRANSPARENT,
  renderTemplateString,
} from '@/lib/email-template-preview';
import {
  injectInspectMarkers,
  readInspectSourceOffset,
  scrollTextareaToIndex,
} from '@/lib/html-source-locate';
import { cn } from '@/lib/utils';
import { Highlighter, Monitor, MousePointer2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const MIN_PANE_PERCENT = 20;
const MAX_PANE_PERCENT = 80;
const DEFAULT_LEFT_PERCENT = 50;

type PreviewWidthOption = 'full' | `${number}`;

const PREVIEW_WIDTH_MOBILE: { value: PreviewWidthOption; label: string }[] = [
  { value: '240', label: '240px — Very small' },
  { value: '320', label: '320px — Mobile (small)' },
  { value: '375', label: '375px — Mobile' },
  { value: '390', label: '390px — Mobile (standard)' },
  { value: '414', label: '414px — Mobile (large)' },
];

const PREVIEW_WIDTH_DESKTOP: { value: PreviewWidthOption; label: string }[] = [
  { value: '768', label: '768px — Tablet' },
  { value: '1024', label: '1024px — Desktop' },
  { value: '1280', label: '1280px — Desktop (wide)' },
  { value: '1440', label: '1440px — Desktop (extra wide)' },
];

type HtmlSplitEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Substituted in the preview pane only; source editor keeps raw placeholders. */
  previewVariables?: Record<string, string>;
};

export function HtmlSplitEditor({
  value,
  onChange,
  placeholder,
  className,
  previewVariables,
}: HtmlSplitEditorProps) {
  const [leftPercent, setLeftPercent] = useState(DEFAULT_LEFT_PERCENT);
  const [previewWidth, setPreviewWidth] = useState<PreviewWidthOption>('full');
  const [inspectMode, setInspectMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState(
    DEFAULT_PREVIEW_HIGHLIGHT_COLOR,
  );
  const [solidHighlightColor, setSolidHighlightColor] = useState(
    DEFAULT_PREVIEW_HIGHLIGHT_COLOR,
  );
  const highlightDisabled = isPreviewHighlightDisabled(highlightColor);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draggingRef = useRef(false);
  const hoveredElRef = useRef<Element | null>(null);
  const inspectModeRef = useRef(inspectMode);

  inspectModeRef.current = inspectMode;

  const previewWidthPx =
    previewWidth === 'full' ? null : Number.parseInt(previewWidth, 10);

  const hasPreviewVariables = useMemo(
    () =>
      Object.values(previewVariables ?? {}).some((v) => v.trim() !== ''),
    [previewVariables],
  );

  const previewHtml = useMemo(() => {
    const raw =
      value.trim() ||
      '<p style="color:#6b7280;margin:0">No HTML to preview.</p>';
    const marked = injectInspectMarkers(raw);
    if (!hasPreviewVariables) return marked;
    return renderTemplateString(marked, previewVariables ?? {}, {
      highlightColor,
    });
  }, [value, previewVariables, hasPreviewVariables, highlightColor]);

  const previewSrcDoc = useMemo(() => {
    if (previewWidthPx === null) return null;
    return buildEmailPreviewSrcDoc(previewHtml, previewWidthPx, {
      inspectMode,
    });
  }, [previewHtml, previewWidthPx, inspectMode]);

  const getPreviewRoot = useCallback((): Element | null => {
    if (previewWidthPx !== null) {
      return iframeRef.current?.contentDocument?.body ?? null;
    }
    return previewRef.current;
  }, [previewWidthPx]);

  const syncIframeHeight = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;

    const height = Math.max(
      doc.body?.scrollHeight ?? 0,
      doc.documentElement?.scrollHeight ?? 0,
    );
    iframe.style.height = `${height}px`;
  }, []);

  useEffect(() => {
    if (previewWidthPx === null) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      syncIframeHeight();
    };

    iframe.addEventListener('load', onLoad);
    if (iframe.contentDocument?.readyState === 'complete') {
      onLoad();
    }

    const frameId = requestAnimationFrame(onLoad);
    return () => {
      iframe.removeEventListener('load', onLoad);
      cancelAnimationFrame(frameId);
    };
  }, [previewSrcDoc, previewWidthPx, syncIframeHeight]);

  const clearHoverHighlight = useCallback(() => {
    if (hoveredElRef.current) {
      hoveredElRef.current.classList.remove('__html-inspect-hover');
      hoveredElRef.current = null;
    }
  }, []);

  const jumpToSourceOffset = useCallback((index: number) => {
    const textarea = textareaRef.current;
    const scrollParent = sourceScrollRef.current;
    if (!textarea || !scrollParent) return;
    scrollTextareaToIndex(textarea, scrollParent, index);
  }, []);

  const findMarkedElement = useCallback((target: EventTarget | null) => {
    const root = getPreviewRoot();
    if (!root || !(target instanceof Element)) return null;
    if (target === root || !root.contains(target)) return null;
    const marked = target.closest('[data-hse-off]');
    return marked instanceof Element ? marked : null;
  }, [getPreviewRoot]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const attachInspectListeners = (root: Element) => {
      const onPointerOver = (event: PointerEvent) => {
        if (!inspectModeRef.current) return;
        const marked = findMarkedElement(event.target);
        if (!marked) return;

        if (hoveredElRef.current && hoveredElRef.current !== marked) {
          hoveredElRef.current.classList.remove('__html-inspect-hover');
        }
        hoveredElRef.current = marked;
        marked.classList.add('__html-inspect-hover');
      };

      const onPointerOut = (event: PointerEvent) => {
        if (!inspectModeRef.current) return;
        const related = event.relatedTarget;
        if (related instanceof Node && hoveredElRef.current?.contains(related)) {
          return;
        }
        clearHoverHighlight();
      };

      const onPointerDown = (event: PointerEvent) => {
        if (!inspectModeRef.current) return;
        if (event.button !== 0) return;

        const marked = findMarkedElement(event.target);
        if (!marked) return;

        event.preventDefault();
        event.stopPropagation();

        const index = readInspectSourceOffset(marked);
        if (index === null) {
          toast.error('Could not find this element in the HTML source.');
          return;
        }

        jumpToSourceOffset(index);
      };

      root.addEventListener('pointerover', onPointerOver, true);
      root.addEventListener('pointerout', onPointerOut, true);
      root.addEventListener('pointerdown', onPointerDown, true);

      return () => {
        root.removeEventListener('pointerover', onPointerOver, true);
        root.removeEventListener('pointerout', onPointerOut, true);
        root.removeEventListener('pointerdown', onPointerDown, true);
      };
    };

    if (previewWidthPx !== null) {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const setup = () => {
        cleanup?.();
        const root = iframe.contentDocument?.body;
        if (!root) return;
        cleanup = attachInspectListeners(root);
      };

      iframe.addEventListener('load', setup);
      if (iframe.contentDocument?.readyState === 'complete') {
        setup();
      }

      return () => {
        iframe.removeEventListener('load', setup);
        cleanup?.();
        clearHoverHighlight();
      };
    }

    const root = previewRef.current;
    if (!root) return;

    cleanup = attachInspectListeners(root);
    return () => {
      cleanup?.();
      clearHoverHighlight();
    };
  }, [
    previewHtml,
    previewSrcDoc,
    previewWidthPx,
    findMarkedElement,
    jumpToSourceOffset,
    clearHoverHighlight,
  ]);

  useEffect(() => {
    if (!inspectMode) clearHoverHighlight();
  }, [inspectMode, clearHoverHighlight]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offset = event.clientX - rect.left;
    const percent = (offset / rect.width) * 100;
    setLeftPercent(
      Math.min(MAX_PANE_PERCENT, Math.max(MIN_PANE_PERCENT, percent)),
    );
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startResize = (event: React.MouseEvent) => {
    event.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full min-h-0 w-full overflow-hidden rounded-md border',
        className,
      )}
    >
      <style>{`
        .html-preview-inspect,
        .html-preview-inspect * {
          cursor: crosshair !important;
        }
        .__html-inspect-hover {
          outline: 2px solid rgb(59 130 246) !important;
          outline-offset: 1px;
        }
        .email-preview-content {
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .email-preview-content img,
        .email-preview-content video,
        .email-preview-content svg {
          max-width: 100%;
          height: auto;
        }
      `}</style>

      <div
        className="flex h-full min-h-0 min-w-0 flex-col border-r"
        style={{ width: `${leftPercent}%` }}
      >
        <div className="shrink-0 border-b bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          HTML source
        </div>
        <div ref={sourceScrollRef} className="min-h-0 flex-1 overflow-auto">
          <Textarea
            ref={textareaRef}
            value={value}
            placeholder={placeholder}
            wrap="off"
            onChange={(e) => onChange(e.target.value)}
            className="block min-h-full w-max min-w-full resize-none rounded-none border-0 font-mono text-sm whitespace-pre shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize editor panes"
        title="Drag to resize"
        onMouseDown={startResize}
        className="relative z-10 w-2 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary/40 active:bg-primary/50"
      >
        <span className="absolute top-1/2 left-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/40" />
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {hasPreviewVariables ? 'Preview (test data)' : 'Preview'}
          </span>
          <div className="flex items-center gap-1">
            <Select
              value={previewWidth}
              onValueChange={(value) =>
                setPreviewWidth(value as PreviewWidthOption)
              }
            >
              <SelectTrigger
                className="h-7 w-[10.5rem] gap-1.5 px-2 text-xs"
                title="Simulate preview at a device screen width"
              >
                <Monitor className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {previewWidth === 'full'
                    ? 'Full width'
                    : `${previewWidth}px`}
                </span>
                <SelectValue className="sr-only" />
              </SelectTrigger>
              <SelectContent align="end" className="z-[70]">
                <SelectItem value="full">Full width</SelectItem>
                <SelectGroup>
                  <SelectLabel>Mobile</SelectLabel>
                  {PREVIEW_WIDTH_MOBILE.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Desktop</SelectLabel>
                  {PREVIEW_WIDTH_DESKTOP.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 px-2 text-xs"
                  title="Highlight color for substituted test data"
                >
                  <Highlighter className="h-3.5 w-3.5" />
                  <span
                    className={cn(
                      'h-3.5 w-3.5 rounded-sm border border-border',
                      highlightDisabled && 'border-dashed bg-transparent',
                    )}
                    style={
                      highlightDisabled
                        ? {
                            backgroundImage:
                              'linear-gradient(45deg,#d4d4d4 25%,transparent 25%),linear-gradient(-45deg,#d4d4d4 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d4d4d4 75%),linear-gradient(-45deg,transparent 75%,#d4d4d4 75%)',
                            backgroundSize: '6px 6px',
                          }
                        : { backgroundColor: highlightColor }
                    }
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[70] w-52 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Highlight color
                </p>
                <input
                  type="color"
                  value={solidHighlightColor}
                  aria-label="Highlight color"
                  className="h-9 w-full cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                  onChange={(e) => {
                    setSolidHighlightColor(e.target.value);
                    setHighlightColor(e.target.value);
                  }}
                />
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                  className="text-sm"
                  onSelect={() =>
                    setHighlightColor(PREVIEW_HIGHLIGHT_TRANSPARENT)
                  }
                >
                  <span
                    className="mr-2 h-4 w-4 shrink-0 rounded-sm border border-border"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg,#d4d4d4 25%,transparent 25%),linear-gradient(-45deg,#d4d4d4 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d4d4d4 75%),linear-gradient(-45deg,transparent 75%,#d4d4d4 75%)',
                      backgroundSize: '6px 6px',
                    }}
                  />
                  Transparent
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              size="sm"
              variant={inspectMode ? 'default' : 'outline'}
              className="h-7 gap-1.5 px-2 text-xs"
              title={
                inspectMode
                  ? 'Click an element in the preview to jump to its tag in the source'
                  : 'Select elements in the preview to locate them in the HTML source'
              }
              onClick={() => setInspectMode((on) => !on)}
            >
              <MousePointer2 className="h-3.5 w-3.5" />
              Inspect
            </Button>
          </div>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/30">
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
            <div
              className="mx-auto overflow-hidden bg-white shadow-sm ring-1 ring-border"
              style={
                previewWidthPx !== null
                  ? { width: `${previewWidthPx}px`, maxWidth: '100%' }
                  : { width: '100%' }
              }
            >
              {previewWidthPx !== null ? (
                <iframe
                  ref={iframeRef}
                  title="Email preview"
                  srcDoc={previewSrcDoc ?? ''}
                  sandbox="allow-same-origin"
                  className="block w-full border-0"
                  scrolling="no"
                />
              ) : (
                <div
                  ref={previewRef}
                  className={cn(
                    'email-preview-content p-4 text-sm text-foreground [&_a]:text-primary',
                    inspectMode &&
                      'html-preview-inspect ring-1 ring-inset ring-primary/30',
                  )}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
