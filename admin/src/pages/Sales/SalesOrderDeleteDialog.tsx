import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SalesOrderRow, SalesOrdersDataset } from './salesOrderShared';

type SalesOrderDeleteDialogProps = {
  dataset: SalesOrdersDataset;
  target: SalesOrderRow | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function SalesOrderDeleteDialog({
  dataset,
  target,
  saving,
  onOpenChange,
  onConfirm,
}: SalesOrderDeleteDialogProps) {
  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {dataset.entityName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This moves {dataset.entityName} #{target?.id} to archived orders and
            removes it from the active list. Line items and payment history stay
            linked by order ID.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={saving}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
