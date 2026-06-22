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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, Circle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isSalesOrderItemPickerTarget } from './SalesOrderItemPicker';
import {
  SalesOrderFormField,
  SalesOrderFormSection,
  salesOrderFormGridClass,
} from './SalesOrderFormField';
import { SalesOrderItemsEditor } from './SalesOrderItemsEditor';
import { fetchOrderItems, mapDbItemToForm } from './salesOrderDb';
import {
  canCancelOrder,
  formatOrderStatusLabel,
  fulfillmentMethodLabel,
  getFulfillmentStepIndex,
  getFulfillmentWorkflow,
} from './salesOrderFulfillment';
import {
  emptyOrderForm,
  syncTotalsFromItems,
  type OrderStatus,
  type SalesOrderItemForm,
  type SalesOrderRow,
} from './salesOrderShared';

export type SalesOrderFulfillmentDetails = {
  items: SalesOrderItemForm[];
  subtotal: string;
  coupon_code: string | null;
  coupon_discount: string;
  wholesale_discount: string;
  tax_total: string;
  shipping_fee: string;
  grand_total: string;
};

type FulfillmentTotals = Omit<SalesOrderFulfillmentDetails, 'items'>;

type SalesOrderFulfillmentDialogProps = {
  order: SalesOrderRow | null;
  saving: boolean;
  isGstInclusive?: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (orderId: number, status: OrderStatus) => void;
  onCancelOrder: (orderId: number) => void;
  onSaveDetails?: (orderId: number, details: SalesOrderFulfillmentDetails) => void;
};

function formatMoney(value: string | number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '$0.00';
  return `$${amount.toFixed(2)}`;
}

function totalsFromOrder(order: SalesOrderRow): FulfillmentTotals {
  return {
    subtotal: order.subtotal,
    coupon_code: order.coupon_code,
    coupon_discount: order.coupon_discount,
    wholesale_discount: order.wholesale_discount,
    tax_total: order.tax_total,
    shipping_fee: order.shipping_fee,
    grand_total: order.grand_total,
  };
}

function syncFulfillmentTotals(
  items: SalesOrderItemForm[],
  totals: FulfillmentTotals,
  orderType: SalesOrderRow['order_type'],
  tax: { isGstInclusive: boolean } = { isGstInclusive: true },
): FulfillmentTotals {
  const synced = syncTotalsFromItems({
    ...emptyOrderForm(null, orderType),
    ...totals,
    items,
  }, tax);

  return {
    subtotal: synced.subtotal,
    coupon_code: totals.coupon_code,
    coupon_discount: synced.coupon_discount,
    wholesale_discount: synced.wholesale_discount,
    tax_total: synced.tax_total,
    shipping_fee: synced.shipping_fee,
    grand_total: synced.grand_total,
  };
}

export function SalesOrderFulfillmentDialog({
  order,
  saving,
  isGstInclusive = true,
  onOpenChange,
  onStatusChange,
  onCancelOrder,
  onSaveDetails,
}: SalesOrderFulfillmentDialogProps) {
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [items, setItems] = useState<SalesOrderItemForm[]>([]);
  const [totals, setTotals] = useState<FulfillmentTotals | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  useEffect(() => {
    if (!order) {
      setItems([]);
      setTotals(null);
      setItemsError(null);
      setItemsLoading(false);
      return;
    }

    setTotals(totalsFromOrder(order));

    let cancelled = false;

    const loadItems = async () => {
      setItemsLoading(true);
      setItemsError(null);
      try {
        const rows = await fetchOrderItems(order.id);
        if (!cancelled) {
          setItems(rows.map((row) => mapDbItemToForm(row)));
        }
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setItemsError(
            err instanceof Error ? err.message : 'Failed to load line items.',
          );
        }
      } finally {
        if (!cancelled) {
          setItemsLoading(false);
        }
      }
    };

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [order]);

  if (!order || !totals) return null;

  const isPending = order.status === 'pending';
  const canEditDetails = isPending && !itemsLoading && !itemsError;
  const id = (field: string) => `fulfill-${order.id}-${field}`;

  const applyItemsChange = (nextItems: SalesOrderItemForm[]) => {
    setItems(nextItems);
    setTotals((current) =>
      current ? syncFulfillmentTotals(nextItems, current, order.order_type, { isGstInclusive }) : current,
    );
  };

  const applyTotalsChange = (patch: Partial<FulfillmentTotals>) => {
    setTotals((current) =>
      current
        ? syncFulfillmentTotals(items, { ...current, ...patch }, order.order_type, { isGstInclusive })
        : current,
    );
  };

  const handleSaveDetails = () => {
    if (!onSaveDetails) return;
    onSaveDetails(order.id, {
      items,
      ...totals,
    });
  };

  const workflow = getFulfillmentWorkflow(order.requested_fulfillment_method);
  const currentIndex = getFulfillmentStepIndex(order.status, workflow);
  const showCancel = canCancelOrder(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <>
      <Dialog open={order !== null} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[90vh] w-[95vw] max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-6xl [&_[data-slot=dialog-header]]:shrink-0 [&_[data-slot=dialog-footer]]:shrink-0"
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
          <DialogHeader className="shrink-0">
            <DialogTitle>Fulfill order #{order.id}</DialogTitle>
            <DialogDescription>
              {fulfillmentMethodLabel(order.requested_fulfillment_method)} fulfillment
              for {order.customer_name}.
              {isPending
                ? ' Adjust line items and pricing, then save or advance the order status.'
                : ' Review items and update the order status.'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <SalesOrderFormSection
              title="Line items"
              description={
                isPending ? 'Edit products and quantities while the order is pending.' : undefined
              }
              className="min-w-0"
            >
              {itemsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : itemsError ? (
                <p className="text-sm text-destructive">{itemsError}</p>
              ) : (
                <SalesOrderItemsEditor
                  orderType={order.order_type}
                  items={items}
                  onItemsChange={applyItemsChange}
                  idPrefix={`fulfill-${order.id}`}
                  disabled={saving}
                  readOnly={!canEditDetails}
                  showHeader={false}
                  compact
                />
              )}
            </SalesOrderFormSection>

            <div className="grid gap-4 lg:grid-cols-2">
            <SalesOrderFormSection
              title="Order totals"
              description={
                isPending ? 'Update fees and discounts before confirming the order.' : undefined
              }
            >
              {canEditDetails ? (
                <div className={salesOrderFormGridClass}>
                  <SalesOrderFormField
                    label="Subtotal"
                    htmlFor={id('subtotal')}
                    value={`$${Number(totals.subtotal).toFixed(2)}`}
                    valueClassName="tabular-nums"
                  >
                    <Input
                      id={id('subtotal')}
                      type="number"
                      min="0"
                      step="0.01"
                      value={totals.subtotal}
                      disabled={saving}
                      onChange={(e) => applyTotalsChange({ subtotal: e.target.value })}
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Coupon code"
                    htmlFor={id('coupon-code')}
                    value={totals.coupon_code ?? '—'}
                  >
                    <Input
                      id={id('coupon-code')}
                      value={totals.coupon_code ?? ''}
                      disabled={saving}
                      onChange={(e) =>
                        applyTotalsChange({
                          coupon_code: e.target.value.trim() || null,
                        })
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Coupon discount"
                    htmlFor={id('coupon-discount')}
                    value={`$${Number(totals.coupon_discount).toFixed(2)}`}
                    valueClassName="tabular-nums"
                  >
                    <Input
                      id={id('coupon-discount')}
                      type="number"
                      min="0"
                      step="0.01"
                      value={totals.coupon_discount}
                      disabled={saving}
                      onChange={(e) => applyTotalsChange({ coupon_discount: e.target.value })}
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Wholesale discount"
                    htmlFor={id('wholesale-discount')}
                    value={`$${Number(totals.wholesale_discount).toFixed(2)}`}
                    valueClassName="tabular-nums"
                  >
                    <Input
                      id={id('wholesale-discount')}
                      type="number"
                      min="0"
                      step="0.01"
                      value={totals.wholesale_discount}
                      disabled={saving}
                      onChange={(e) =>
                        applyTotalsChange({ wholesale_discount: e.target.value })
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Shipping fee"
                    htmlFor={id('shipping-fee')}
                    value={`$${Number(totals.shipping_fee).toFixed(2)}`}
                    valueClassName="tabular-nums"
                  >
                    <Input
                      id={id('shipping-fee')}
                      type="number"
                      min="0"
                      step="0.01"
                      value={totals.shipping_fee}
                      disabled={saving}
                      onChange={(e) => applyTotalsChange({ shipping_fee: e.target.value })}
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Grand total"
                    readOnly
                    value={`$${Number(totals.grand_total).toFixed(2)}`}
                    valueClassName="tabular-nums font-medium"
                  />
                </div>
              ) : (
                <dl className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-medium tabular-nums">{formatMoney(totals.subtotal)}</dd>
                  </div>
                  {totals.coupon_code ? (
                    <div className="flex justify-between gap-4 sm:block">
                      <dt className="text-muted-foreground">Coupon ({totals.coupon_code})</dt>
                      <dd className="font-medium tabular-nums">
                        -{formatMoney(totals.coupon_discount)}
                      </dd>
                    </div>
                  ) : Number(totals.coupon_discount) > 0 ? (
                    <div className="flex justify-between gap-4 sm:block">
                      <dt className="text-muted-foreground">Coupon discount</dt>
                      <dd className="font-medium tabular-nums">
                        -{formatMoney(totals.coupon_discount)}
                      </dd>
                    </div>
                  ) : null}
                  {Number(totals.wholesale_discount) > 0 ? (
                    <div className="flex justify-between gap-4 sm:block">
                      <dt className="text-muted-foreground">Wholesale discount</dt>
                      <dd className="font-medium tabular-nums">
                        -{formatMoney(totals.wholesale_discount)}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-muted-foreground">Shipping</dt>
                    <dd className="font-medium tabular-nums">{formatMoney(totals.shipping_fee)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t pt-3">
                    <dt className="font-medium">Grand total</dt>
                    <dd className="text-base font-semibold tabular-nums">
                      {formatMoney(totals.grand_total)}
                    </dd>
                  </div>
                </dl>
              )}
            </SalesOrderFormSection>

            <SalesOrderFormSection title="Fulfillment status">
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
            </SalesOrderFormSection>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 sm:justify-between">
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
            <div className="flex flex-wrap gap-2">
              {canEditDetails && onSaveDetails ? (
                <Button type="button" disabled={saving} onClick={handleSaveDetails}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
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
