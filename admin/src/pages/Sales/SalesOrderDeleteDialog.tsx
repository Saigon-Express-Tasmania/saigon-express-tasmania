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
  const description = dataset.archiveOnDelete
    ? `This archives and permanently removes ${dataset.entityName} #${target?.id} and all line items. This cannot be undone.`
    : `This permanently removes ${dataset.entityName} #${target?.id} and all line items. This cannot be undone.`;

  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {dataset.entityName}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
