import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const previewHtml =
    value.trim() ||
    '<p style="color:#6b7280;margin:0">No HTML to preview.</p>';

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
      <div
        className="flex h-full min-h-0 min-w-0 flex-col border-r"
        style={{ width: `${leftPercent}%` }}
      >
        <div className="shrink-0 border-b bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          HTML source
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <Textarea
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
        <div className="shrink-0 border-b bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Preview
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-white">
          <div
            className="inline-block min-h-full w-max min-w-full p-4 text-sm text-foreground [&_a]:text-primary"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
}
