import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { FolderImportProgress } from './franchiseResourceFolderImport';

type FranchiseResourceFolderImportDialogProps = {
  progress: FolderImportProgress | null;
};

export function FranchiseResourceFolderImportDialog({
  progress,
}: FranchiseResourceFolderImportDialogProps) {
  return (
    <Dialog open={progress !== null}>
      <DialogContent
        className="sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Importing folder</DialogTitle>
          <DialogDescription>
            {progress?.phase === 'preparing'
              ? 'Preparing import…'
              : progress && (
                  <>
                    Batch {progress.batch} of {progress.batchCount} —{' '}
                    {progress.processed} of {progress.total} file
                    {progress.total === 1 ? '' : 's'}
                    {progress.currentLabel ? (
                      <>
                        <br />
                        <span className="text-foreground/80">
                          {progress.currentLabel}
                        </span>
                      </>
                    ) : null}
                  </>
                )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{
                width: progress
                  ? `${Math.round((progress.processed / progress.total) * 100)}%`
                  : '0%',
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading documents…
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
