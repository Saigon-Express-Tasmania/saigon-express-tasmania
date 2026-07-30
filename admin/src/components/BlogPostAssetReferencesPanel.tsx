import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STORAGE_BUCKET } from '@/constants';
import { useStorage } from '@/hooks/useStorage';
import { cn } from '@/lib/utils';
import { resolveStorageObjectPath } from '@/lib/storage-path';
import type { BlogPostReference } from '@/types/BlogPost';
import { Check, Copy, ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type BlogPostAssetReferencesPanelProps = {
  reference: BlogPostReference;
  onReferenceChange: (reference: BlogPostReference) => void;
  className?: string;
};

export function BlogPostAssetReferencesPanel({
  reference,
  onReferenceChange,
  className,
}: BlogPostAssetReferencesPanelProps) {
  const { deleteMedia } = useStorage();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const entries = [...reference.uploaded].sort(
    (a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );

  const copyValue = async (index: number, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
      toast.success('URL copied.');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  const removeEntry = (path: string, publicUrl: string) => {
    onReferenceChange({
      uploaded: reference.uploaded.filter(
        (entry) => entry.path !== path || entry.publicUrl !== publicUrl,
      ),
    });
  };

  const handleDelete = async (index: number) => {
    const asset = entries[index];
    if (!asset) return;

    const storagePath = resolveStorageObjectPath({
      path: asset.path,
      publicUrl: asset.publicUrl,
      bucket: STORAGE_BUCKET,
    });

    if (!storagePath) {
      toast.error('Could not determine the storage path for this asset.');
      return;
    }

    if (
      !window.confirm(
        `Delete "${asset.fileName}" from storage? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingIndex(index);
    try {
      await deleteMedia(storagePath);
      removeEntry(asset.path, asset.publicUrl);
      toast.success('Asset deleted from storage.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete asset.',
      );
    } finally {
      setDeletingIndex(null);
    }
  };

  if (entries.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center',
          className,
        )}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No uploaded assets yet</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Images uploaded through the content editor are tracked here. Insert
          images in the Content tab to add them.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm text-muted-foreground">
        {entries.length} asset{entries.length === 1 ? '' : 's'} uploaded via the
        content editor. Remove unused files from Supabase storage.
      </p>
      {entries.map((asset, index) => (
        <div
          key={`${asset.path}:${asset.publicUrl}`}
          className="grid gap-4 rounded-lg border bg-muted/15 p-4 shadow-xs sm:grid-cols-[auto_1fr_auto]"
        >
          {asset.publicUrl ? (
            <img
              src={asset.publicUrl}
              alt=""
              className="h-20 w-20 rounded-md border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted/40 text-xs text-muted-foreground">
              No preview
            </div>
          )}

          <div className="grid min-w-0 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">File</Label>
              <Input
                value={asset.fileName}
                readOnly
                className="bg-muted/40 font-mono text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Storage path
              </Label>
              <Input
                value={
                  resolveStorageObjectPath({
                    path: asset.path,
                    publicUrl: asset.publicUrl,
                    bucket: STORAGE_BUCKET,
                  }) ?? asset.path
                }
                readOnly
                className="bg-muted/40 font-mono text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Public URL</Label>
              <Input
                value={asset.publicUrl}
                readOnly
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex items-start gap-1 sm:flex-col">
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Copy URL"
              onClick={() => void copyValue(index, asset.publicUrl)}
            >
              {copiedIndex === index ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Delete from storage"
              disabled={deletingIndex === index}
              onClick={() => void handleDelete(index)}
            >
              {deletingIndex === index ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
