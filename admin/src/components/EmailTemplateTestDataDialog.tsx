import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type EmailTemplateTestDataDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variableKeys: string[];
  testData: Record<string, string>;
  onTestDataChange: (testData: Record<string, string>) => void;
};

const TEST_DATA_TEXTAREA_MAX_ROWS = 5;

const testDataTextareaClassName = cn(
  'min-h-9 resize-none overflow-y-hidden field-sizing-content',
);

function syncTextareaHeight(textarea: HTMLTextAreaElement) {
  const style = window.getComputedStyle(textarea);
  const lineHeight =
    Number.parseFloat(style.lineHeight) ||
    Number.parseFloat(style.fontSize) * 1.25 ||
    20;
  const padding =
    Number.parseFloat(style.paddingTop) +
    Number.parseFloat(style.paddingBottom);
  const maxHeight = lineHeight * TEST_DATA_TEXTAREA_MAX_ROWS + padding;

  textarea.style.height = 'auto';
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

function TestDataVariableField({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    syncTextareaHeight(textarea);
  }, [value]);

  return (
    <Textarea
      ref={textareaRef}
      id={id}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        syncTextareaHeight(e.target);
      }}
      className={testDataTextareaClassName}
    />
  );
}

function syncTestDataKeys(
  current: Record<string, string>,
  keys: string[],
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const key of keys) {
    next[key] = current[key] ?? '';
  }
  return next;
}

export function EmailTemplateTestDataDialog({
  open,
  onOpenChange,
  variableKeys,
  testData,
  onTestDataChange,
}: EmailTemplateTestDataDialogProps) {
  const [draft, setDraft] = useState(testData);

  useEffect(() => {
    if (!open) return;
    setDraft(syncTestDataKeys(testData, variableKeys));
  }, [open, testData, variableKeys.join(',')]);

  const handleDone = () => {
    onTestDataChange(syncTestDataKeys(draft, variableKeys));
    onOpenChange(false);
  };

  const updateValue = (key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Test template data</DialogTitle>
          <DialogDescription>
            Sample values for <code className="text-xs">{'{{variable}}'}</code>{' '}
            placeholders. Used in the HTML preview only — the source editor and
            plain text tab stay unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {variableKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No template variables found in subject or body. Add placeholders
              like <code className="text-xs">{'{{customerName}}'}</code> first.
            </p>
          ) : (
            <div className="space-y-3">
              {variableKeys.map((key) => (
                <div key={key} className="grid gap-1.5">
                  <Label htmlFor={`test-var-${key}`} className="font-mono text-sm">
                    {`{{${key}}}`}
                  </Label>
                  <TestDataVariableField
                    id={`test-var-${key}`}
                    value={draft[key] ?? ''}
                    placeholder={`Sample value for ${key}`}
                    onChange={(value) => updateValue(key, value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleDone}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
