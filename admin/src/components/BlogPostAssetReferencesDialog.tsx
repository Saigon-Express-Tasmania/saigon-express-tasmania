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
import { STORAGE_BUCKET } from '@/constants';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { resolveStorageObjectPath } from '@/lib/storage-path';
import type { BlogPostReference } from '@/types/BlogPost';
import { Check, Copy, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type BlogPostAssetReferencesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: BlogPostReference;
  onReferenceChange: (reference: BlogPostReference) => void;
};

export function BlogPostAssetReferencesDialog({
  open,
  onOpenChange,
  reference,
  onReferenceChange,
}: BlogPostAssetReferencesDialogProps) {
  const { deleteMedia } = useSupabaseStorage();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Asset references</DialogTitle>
          <DialogDescription>
            Images uploaded through the content editor are tracked here. Remove
            unused files from Supabase storage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No uploaded assets yet. Insert images in the content editor to add
              them here.
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map((asset, index) => (
                <div
                  key={`${asset.path}:${asset.publicUrl}`}
                  className="grid gap-3 rounded-md border p-3 sm:grid-cols-[auto_1fr_auto]"
                >
                  {asset.publicUrl ? (
                    <img
                      src={asset.publicUrl}
                      alt=""
                      className="h-16 w-16 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted/40 text-xs text-muted-foreground">
                      No preview
                    </div>
                  )}

                  <div className="grid min-w-0 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">
                        File
                      </Label>
                      <Input
                        value={asset.fileName}
                        readOnly
                        className="bg-muted/40 font-mono text-sm"
                      />
                    </div>
                    <div className="grid gap-1">
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
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">
                        Public URL
                      </Label>
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
