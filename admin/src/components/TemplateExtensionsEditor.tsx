import { HtmlSplitEditor } from '@/components/HtmlSplitEditor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type ContentTarget = 'main' | number;

type TemplateExtensionsEditorProps = {
  mode: 'html' | 'text';
  mainValue: string;
  onMainChange: (value: string) => void;
  extensions: string[];
  onExtensionsChange: (extensions: string[]) => void;
  mainPlaceholder?: string;
  extensionPlaceholder?: string;
  className?: string;
  previewVariables?: Record<string, string>;
};

function targetToSelectValue(target: ContentTarget): string {
  return target === 'main' ? 'main' : String(target);
}

function selectValueToTarget(value: string): ContentTarget {
  if (value === 'main') return 'main';
  const index = Number.parseInt(value, 10);
  return Number.isNaN(index) ? 'main' : index;
}

export function TemplateExtensionsEditor({
  mode,
  mainValue,
  onMainChange,
  extensions,
  onExtensionsChange,
  mainPlaceholder,
  extensionPlaceholder,
  className,
  previewVariables,
}: TemplateExtensionsEditorProps) {
  const [target, setTarget] = useState<ContentTarget>('main');

  useEffect(() => {
    if (typeof target === 'number' && target >= extensions.length) {
      setTarget(extensions.length > 0 ? extensions.length - 1 : 'main');
    }
  }, [extensions.length, target]);

  const isMain = target === 'main';
  const extensionIndex = typeof target === 'number' ? target : null;
  const currentValue =
    isMain || extensionIndex === null
      ? mainValue
      : (extensions[extensionIndex] ?? '');

  const handleChange = (value: string) => {
    if (isMain || extensionIndex === null) {
      onMainChange(value);
      return;
    }
    const next = [...extensions];
    next[extensionIndex] = value;
    onExtensionsChange(next);
  };

  const handleAddExtension = () => {
    const next = [...extensions, ''];
    onExtensionsChange(next);
    setTarget(next.length - 1);
  };

  const handleRemoveExtension = () => {
    if (extensionIndex === null) return;
    onExtensionsChange(extensions.filter((_, i) => i !== extensionIndex));
    setTarget('main');
  };

  const editorPlaceholder =
    isMain || extensionIndex === null
      ? mainPlaceholder
      : extensionPlaceholder;

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-2', className)}>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Label htmlFor={`${mode}-content-target`} className="sr-only">
          Content target
        </Label>
        <Select
          value={targetToSelectValue(target)}
          onValueChange={(value) => setTarget(selectValueToTarget(value))}
        >
          <SelectTrigger id={`${mode}-content-target`} className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="main">Main body</SelectItem>
            {extensions.map((_, index) => (
              <SelectItem key={index} value={String(index)}>
                Extension {index + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={handleAddExtension}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add extension
        </Button>

        {!isMain && extensionIndex !== null && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-destructive hover:text-destructive"
            onClick={handleRemoveExtension}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove extension
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {mode === 'html' ? (
          <HtmlSplitEditor
            className="h-full"
            value={currentValue}
            placeholder={editorPlaceholder}
            onChange={handleChange}
            previewVariables={previewVariables}
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
              <Textarea
                value={currentValue}
                wrap="off"
                placeholder={editorPlaceholder}
                onChange={(e) => handleChange(e.target.value)}
                className="min-h-full w-max min-w-full resize-none rounded-md border-0 font-mono text-sm whitespace-pre shadow-none focus-visible:ring-0"
              />
            </div>
            {isMain && (
              <p className="shrink-0 text-xs text-muted-foreground">
                Plain text is optional; leave empty if you only send HTML.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
