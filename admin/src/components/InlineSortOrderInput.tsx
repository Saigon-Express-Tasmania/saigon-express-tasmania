import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function InlineSortOrderInput({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  onCommit: (sortOrder: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = async () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setDraft(String(value));
      toast.error('Sort order must be a non-negative integer.');
      return;
    }
    if (parsed === value) return;

    setSaving(true);
    try {
      await onCommit(parsed);
    } catch {
      setDraft(String(value));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Input
      type="number"
      min={0}
      step={1}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      disabled={disabled || saving}
      className="h-8 w-20 font-mono text-sm"
      aria-label="Sort order"
    />
  );
}
