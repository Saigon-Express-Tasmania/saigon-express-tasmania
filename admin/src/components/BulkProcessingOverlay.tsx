import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

type BulkProcessingOverlayProps = {
  open: boolean;
  message: string;
};

export function BulkProcessingOverlay({
  open,
  message,
}: BulkProcessingOverlayProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Processing bulk action</DialogTitle>
        <DialogDescription className="sr-only">{message}</DialogDescription>
        <div className="flex flex-col items-center gap-4 py-2">
          <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
          <p className="text-center text-sm font-medium">{message}</p>
          <p className="text-center text-xs text-muted-foreground">
            Please wait while this finishes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export async function withBulkProcessing(
  setMessage: (message: string | null) => void,
  setSaving: (saving: boolean) => void,
  message: string,
  action: () => Promise<void>,
): Promise<void> {
  setMessage(message);
  setSaving(true);
  try {
    await action();
  } finally {
    setSaving(false);
    setMessage(null);
  }
}
