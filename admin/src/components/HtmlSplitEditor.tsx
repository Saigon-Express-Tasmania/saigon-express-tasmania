import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  injectInspectMarkers,
  readInspectSourceOffset,
  scrollTextareaToIndex,
} from '@/lib/html-source-locate';
import { cn } from '@/lib/utils';
import { MousePointer2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const MIN_PANE_PERCENT = 20;
const MAX_PANE_PERCENT = 80;
const DEFAULT_LEFT_PERCENT = 50;

type HtmlSplitEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function HtmlSplitEditor({
  value,
  onChange,
  placeholder,
  className,
}: HtmlSplitEditorProps) {
  const [leftPercent, setLeftPercent] = useState(DEFAULT_LEFT_PERCENT);
  const [inspectMode, setInspectMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const hoveredElRef = useRef<Element | null>(null);
  const inspectModeRef = useRef(inspectMode);

  inspectModeRef.current = inspectMode;

  const previewHtml = useMemo(() => {
    const raw =
      value.trim() ||
      '<p style="color:#6b7280;margin:0">No HTML to preview.</p>';
    return injectInspectMarkers(raw);
  }, [value]);

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
    const root = previewRef.current;
    if (!root || !(target instanceof Element)) return null;
    if (target === root || !root.contains(target)) return null;
    const marked = target.closest('[data-hse-off]');
    return marked instanceof Element ? marked : null;
  }, []);

  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;

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
      clearHoverHighlight();
    };
  }, [previewHtml, findMarkedElement, jumpToSourceOffset, clearHoverHighlight]);

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
            Preview
          </span>
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
        <div className="relative min-h-0 flex-1 overflow-auto bg-white">
          <div
            ref={previewRef}
            className={cn(
              'inline-block min-h-full w-max min-w-full p-4 text-sm text-foreground [&_a]:text-primary',
              inspectMode && 'html-preview-inspect ring-1 ring-inset ring-primary/30',
            )}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
}
