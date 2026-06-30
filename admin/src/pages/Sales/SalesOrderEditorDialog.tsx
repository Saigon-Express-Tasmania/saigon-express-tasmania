import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { OrderType } from './orderType';
import { SalesOrderEditorContent } from './SalesOrderEditorContent';
import { isSalesOrderItemPickerTarget } from './SalesOrderItemPicker';
import type { SalesOrderForm, SalesOrdersDataset } from './salesOrderShared';
import { SALES_ORDER_FULLSCREEN_DIALOG_CLASS } from './salesOrderUi';

type SalesOrderEditorDialogProps = {
  dataset: SalesOrdersDataset;
  orderType: OrderType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingOrderId: number | null;
  readOnly?: boolean;
  form: SalesOrderForm;
  onFormChange: (updater: (prev: SalesOrderForm) => SalesOrderForm) => void;
  saving: boolean;
  onSave: () => void;
  isGstInclusive?: boolean;
};

export function SalesOrderEditorDialog({
  dataset,
  orderType,
  open,
  onOpenChange,
  editingOrderId,
  readOnly = false,
  form,
  onFormChange,
  saving,
  onSave,
  isGstInclusive = true,
}: SalesOrderEditorDialogProps) {
  const isEditing = editingOrderId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          SALES_ORDER_FULLSCREEN_DIALOG_CLASS,
          '[&_[data-slot=dialog-header]]:shrink-0 [&_[data-slot=dialog-footer]]:shrink-0',
        )}
        onPointerDownOutside={(event) => {
          if (isSalesOrderItemPickerTarget(event.target)) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          if (isSalesOrderItemPickerTarget(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>
            {readOnly
              ? `View ${dataset.entityName}`
              : isEditing
                ? `Edit ${dataset.entityName}`
                : dataset.addButtonLabel}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? `Review ${dataset.entityName} details across all tabs. Fields are read-only.`
              : `Manage the ${dataset.entityName} payload across customer, items, totals, and payment.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
          <SalesOrderEditorContent
            dataset={dataset}
            orderType={orderType}
            layout="tabs"
            editingOrderId={editingOrderId}
            readOnly={readOnly}
            form={form}
            onFormChange={onFormChange}
            saving={saving}
            isGstInclusive={isGstInclusive}
          />
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          {readOnly ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
