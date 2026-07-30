import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStorage } from '@/hooks/useStorage';
import {
  referenceKeyFromFileName,
  type EmailTemplateReference,
} from '@/types/EmailTemplate';
import { Check, Copy, Loader2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

type EmailTemplateReferencesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: EmailTemplateReference;
  onReferenceChange: (reference: EmailTemplateReference) => void;
  templateName?: string;
};

export function EmailTemplateReferencesDialog({
  open,
  onOpenChange,
  reference,
  onReferenceChange,
  templateName,
}: EmailTemplateReferencesDialogProps) {
  const { uploadMedia, isUploading } = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const entries = Object.entries(reference).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const updateEntry = (key: string, value: string) => {
    onReferenceChange({ ...reference, [key]: value });
  };

  const removeEntry = (key: string) => {
    const next = { ...reference };
    delete next[key];
    onReferenceChange(next);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    const folder = templateName
      ? `email-templates/${templateName}`
      : 'email-templates';

    try {
      const next = { ...reference };

      for (const file of Array.from(files)) {
        const key = referenceKeyFromFileName(file.name);
        const storageName = file.name.replace(/[/\\]/g, '_');

        const { publicUrl } = await uploadMedia(file, {
          folder,
          fileName: storageName,
          upsert: true,
        });

        next[key] = publicUrl;
      }

      onReferenceChange(next);
      toast.success(
        files.length === 1
          ? 'File uploaded and reference updated.'
          : `${files.length} files uploaded.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to upload file.',
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(`Copied ${key}`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Template asset references</DialogTitle>
          <DialogDescription>
            Upload images or other files used in HTML (e.g.{' '}
            <code className="text-xs">{'<img src="{{logo.png}}">'}</code>). Each
            file name becomes a key mapped to its public URL.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.svg"
              multiple
              className="hidden"
              onChange={(e) => void handleUpload(e.target.files)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload file
            </Button>
            <p className="text-xs text-muted-foreground">
              Key is the file name; value is the public URL after upload.
            </p>
          </div>

          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No references yet. Upload a file to add one.
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map(([key, value]) => (
                <div
                  key={key}
                  className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,140px)_1fr_auto]"
                >
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Key</Label>
                    <Input
                      value={key}
                      readOnly
                      className="font-mono text-sm bg-muted/40"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">URL</Label>
                    <Input
                      value={value}
                      onChange={(e) => updateEntry(key, e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-end gap-1 sm:flex-col sm:items-stretch">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      title="Copy URL"
                      onClick={() => void copyValue(key, value)}
                    >
                      {copiedKey === key ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      title="Remove"
                      onClick={() => removeEntry(key)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
