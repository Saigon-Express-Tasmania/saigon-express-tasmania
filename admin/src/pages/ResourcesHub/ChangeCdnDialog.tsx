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
import supabase from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  normalizeCdnBaseUrl,
  replaceCdnUrlPrefix,
} from './changeCdnUrl';
import type { FranchiseResourceKind } from './franchiseResourceShared';

const CDN_RESOURCE_TYPES: FranchiseResourceKind[] = [
  'document',
  'menu_training',
];

type ChangeCdnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, only this type is scanned; otherwise both document and menu_training. */
  resourceType?: FranchiseResourceKind;
  onComplete?: () => void;
};

export function ChangeCdnDialog({
  open,
  onOpenChange,
  resourceType,
  onComplete,
}: ChangeCdnDialogProps) {
  const [oldUrl, setOldUrl] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setOldUrl('');
    setNewUrl('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const oldBase = normalizeCdnBaseUrl(oldUrl);
    const newBase = normalizeCdnBaseUrl(newUrl);

    if (!oldBase) {
      toast.error('Enter the Old URL to replace.');
      return;
    }
    if (!newBase) {
      toast.error('Enter the New URL.');
      return;
    }
    if (oldBase === newBase) {
      toast.error('Old URL and New URL are the same after normalizing slashes.');
      return;
    }

    const types =
      resourceType && CDN_RESOURCE_TYPES.includes(resourceType)
        ? [resourceType]
        : CDN_RESOURCE_TYPES;

    setIsSubmitting(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('franchise_resources')
        .select('id, content_file, video_file')
        .in('type', types);

      if (fetchError) throw fetchError;

      const rows = data ?? [];
      let updatedCount = 0;
      let fieldMatchCount = 0;

      for (const row of rows) {
        const nextContent = replaceCdnUrlPrefix(
          row.content_file,
          oldBase,
          newBase,
        );
        const nextVideo = replaceCdnUrlPrefix(row.video_file, oldBase, newBase);

        const contentChanged = nextContent !== (row.content_file ?? null);
        const videoChanged = nextVideo !== (row.video_file ?? null);

        if (!contentChanged && !videoChanged) continue;

        if (contentChanged) fieldMatchCount += 1;
        if (videoChanged) fieldMatchCount += 1;

        const { error: updateError } = await supabase
          .from('franchise_resources')
          .update({
            content_file: nextContent,
            video_file: nextVideo,
          })
          .eq('id', row.id);

        if (updateError) throw updateError;
        updatedCount += 1;
      }

      if (updatedCount === 0) {
        toast.message('No matching URLs found in content_file or video_file.');
      } else {
        toast.success(
          `Updated ${updatedCount} resource${updatedCount === 1 ? '' : 's'} (${fieldMatchCount} field${fieldMatchCount === 1 ? '' : 's'}).`,
        );
      }

      handleOpenChange(false);
      onComplete?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to change CDN URLs.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>Change CDN</DialogTitle>
            <DialogDescription>
              Replace the storage base URL in{' '}
              <code className="text-xs">content_file</code> and{' '}
              <code className="text-xs">video_file</code> for document and menu
              training resources. Trailing slashes on both URLs are normalized so
              the path keeps a single joining <code className="text-xs">/</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="change-cdn-old-url">Old URL</Label>
              <Input
                id="change-cdn-old-url"
                type="url"
                value={oldUrl}
                onChange={(e) => setOldUrl(e.target.value)}
                placeholder="https://….supabase.co/storage/v1/object/public/saigon-express-tasmania"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="change-cdn-new-url">New URL</Label>
              <Input
                id="change-cdn-new-url"
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://cdn.saigonexpresstasmania.com.au/"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                'Replace URLs'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
