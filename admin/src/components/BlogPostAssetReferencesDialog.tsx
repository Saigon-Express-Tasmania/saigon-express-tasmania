import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BlogPostReference } from '@/types/BlogPost';
import { BlogPostAssetReferencesPanel } from './BlogPostAssetReferencesPanel';

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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
          <BlogPostAssetReferencesPanel
            reference={reference}
            onReferenceChange={onReferenceChange}
          />
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
