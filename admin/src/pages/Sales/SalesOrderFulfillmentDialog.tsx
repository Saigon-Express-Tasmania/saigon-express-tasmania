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
import { Badge } from '@/components/ui/badge';
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
import { Check, Circle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
  canCancelOrder,
  formatOrderStatusLabel,
  fulfillmentMethodLabel,
  getFulfillmentStepIndex,
  getFulfillmentWorkflow,
} from './salesOrderFulfillment';
import type { OrderStatus, SalesOrderRow } from './salesOrderShared';

type SalesOrderFulfillmentDialogProps = {
  order: SalesOrderRow | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (orderId: number, status: OrderStatus) => void;
  onCancelOrder: (orderId: number) => void;
};

export function SalesOrderFulfillmentDialog({
  order,
  saving,
  onOpenChange,
  onStatusChange,
  onCancelOrder,
}: SalesOrderFulfillmentDialogProps) {
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  if (!order) return null;

  const workflow = getFulfillmentWorkflow(order.requested_fulfillment_method);
  const currentIndex = getFulfillmentStepIndex(order.status, workflow);
  const showCancel = canCancelOrder(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <>
      <Dialog open={order !== null} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fulfill order #{order.id}</DialogTitle>
            <DialogDescription>
              {fulfillmentMethodLabel(order.requested_fulfillment_method)} fulfillment
              for {order.customer_name}. Select a status to update the order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current status</span>
              <Badge
                variant={
                  order.status === 'cancelled'
                    ? 'secondary'
                    : order.status === 'completed'
                      ? 'default'
                      : 'outline'
                }
              >
                {formatOrderStatusLabel(order.status)}
              </Badge>
            </div>

            <ol className="space-y-2" role="listbox" aria-label="Order status">
              {workflow.map((status, index) => {
                const isComplete = !isCancelled && currentIndex > index;
                const isCurrent = !isCancelled && currentIndex === index;
                const isSelected = isCurrent;

                return (
                  <li key={status}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={saving || isCurrent}
                      onClick={() => onStatusChange(order.id, status)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                        'hover:bg-muted/80 disabled:cursor-default disabled:opacity-100',
                        isCurrent && 'border-primary bg-primary/5',
                        isComplete && 'text-muted-foreground',
                        !isCurrent && !isCancelled && 'cursor-pointer',
                        saving && !isCurrent && 'pointer-events-none opacity-60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          isComplete && 'border-primary bg-primary text-primary-foreground',
                          isCurrent && 'border-primary',
                        )}
                      >
                        {saving && isCurrent ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isComplete ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Circle
                            className={cn(
                              'h-2 w-2',
                              isCurrent ? 'fill-primary text-primary' : 'text-transparent',
                            )}
                          />
                        )}
                      </span>
                      <span className={cn(isCurrent && 'font-medium')}>
                        {formatOrderStatusLabel(status)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {isCancelled && (
              <p className="text-sm text-muted-foreground">
                Order is cancelled. Select a status above to restore it to the fulfillment
                flow.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {showCancel ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={saving}
                onClick={() => setCancelConfirmOpen(true)}
              >
                Cancel order
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order #{order.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the order as cancelled. You can restore it later by selecting a
              status in the fulfillment dialog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                setCancelConfirmOpen(false);
                onCancelOrder(order.id);
              }}
            >
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
