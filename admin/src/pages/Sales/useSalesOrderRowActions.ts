import { useCallback, useMemo, useState } from 'react';
import supabase from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { OrderType } from './orderType';
import {
  fetchLatestPayment,
  fetchPaymentStatusByOrderIds,
  replaceOrderItems,
  saveOrderPayment,
} from './salesOrderDb';
import { formatOrderStatusLabel } from './salesOrderFulfillment';
import type { SalesOrderFulfillmentDetails } from './SalesOrderFulfillmentDialog';
import {
  emptyOrderForm,
  syncTotalsFromItems,
  validateOrderItems,
  type OrderStatus,
  type SalesOrdersDataset,
  type SalesOrderRow,
} from './salesOrderShared';

type UseSalesOrderRowActionsOptions = {
  dataset: SalesOrdersDataset;
  orderType: OrderType;
  isGstInclusive: boolean;
  onAfterChange?: () => void | Promise<void>;
};

export function useSalesOrderRowActions({
  dataset,
  orderType,
  isGstInclusive,
  onAfterChange,
}: UseSalesOrderRowActionsOptions) {
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesOrderRow | null>(null);
  const [fulfillTarget, setFulfillTarget] = useState<SalesOrderRow | null>(null);

  const taxMode = useMemo(() => ({ isGstInclusive }), [isGstInclusive]);

  const handleFulfillStatusUpdate = useCallback(
    async (orderId: number, status: OrderStatus, successMessage: string) => {
      setSaving(true);
      try {
        const statusUpdatedAt = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status,
            status_updated_at: statusUpdatedAt,
          })
          .eq('id', orderId)
          .eq('is_testing', dataset.isTestingFilter);
        if (updateError) throw updateError;

        toast.success(successMessage);
        setFulfillTarget((current) =>
          current?.id === orderId
            ? { ...current, status, status_updated_at: statusUpdatedAt }
            : current,
        );
        await onAfterChange?.();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : `Failed to update ${dataset.entityName} status.`,
        );
      } finally {
        setSaving(false);
      }
    },
    [dataset.entityName, dataset.isTestingFilter, onAfterChange],
  );

  const handleFulfillStatusChange = useCallback(
    (orderId: number, status: OrderStatus) => {
      void handleFulfillStatusUpdate(
        orderId,
        status,
        `Order status updated to ${formatOrderStatusLabel(status)}.`,
      );
    },
    [handleFulfillStatusUpdate],
  );

  const handleFulfillCancel = useCallback(
    (orderId: number) => {
      void handleFulfillStatusUpdate(orderId, 'cancelled', 'Order cancelled.');
    },
    [handleFulfillStatusUpdate],
  );

  const handleFulfillSaveDetails = useCallback(
    async (orderId: number, details: SalesOrderFulfillmentDetails) => {
      const target = fulfillTarget;
      if (!target || target.id !== orderId || target.status !== 'pending') {
        toast.error('Only pending orders can be edited from fulfillment.');
        return;
      }

      let parsedItems;
      try {
        parsedItems = validateOrderItems(details.items);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Invalid line items.');
        return;
      }

      const syncedTotals = syncTotalsFromItems(
        {
          ...emptyOrderForm(dataset.defaultPaymentMode, orderType),
          items: parsedItems,
          subtotal: details.subtotal,
          coupon_code: details.coupon_code,
          coupon_discount: details.coupon_discount,
          wholesale_discount: details.wholesale_discount,
          tax_total: details.tax_total,
          shipping_fee: details.shipping_fee,
          grand_total: details.grand_total,
        },
        taxMode,
      );

      const subtotal = Number(syncedTotals.subtotal);
      const couponDiscount = Number(syncedTotals.coupon_discount);
      const wholesaleDiscount = Number(syncedTotals.wholesale_discount);
      const taxTotal = Number(syncedTotals.tax_total);
      const shippingFee = Number(syncedTotals.shipping_fee);
      const grandTotal = Number(syncedTotals.grand_total);

      if (
        !Number.isFinite(subtotal) ||
        !Number.isFinite(couponDiscount) ||
        !Number.isFinite(wholesaleDiscount) ||
        !Number.isFinite(taxTotal) ||
        !Number.isFinite(shippingFee) ||
        !Number.isFinite(grandTotal) ||
        subtotal < 0 ||
        couponDiscount < 0 ||
        wholesaleDiscount < 0 ||
        taxTotal < 0 ||
        shippingFee < 0 ||
        grandTotal < 0
      ) {
        toast.error('Order totals must be valid non-negative numbers.');
        return;
      }

      setSaving(true);
      try {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            subtotal: subtotal.toFixed(2),
            coupon_code: syncedTotals.coupon_code?.trim() || null,
            coupon_discount: couponDiscount.toFixed(2),
            wholesale_discount: wholesaleDiscount.toFixed(2),
            tax_total: taxTotal.toFixed(2),
            shipping_fee: shippingFee.toFixed(2),
            grand_total: grandTotal.toFixed(2),
          })
          .eq('id', orderId)
          .eq('status', 'pending')
          .eq('is_testing', dataset.isTestingFilter);

        if (updateError) throw updateError;

        await replaceOrderItems(orderId, orderType, parsedItems);

        const existingPayment = await fetchLatestPayment(orderId);
        if (existingPayment) {
          await saveOrderPayment(orderId, {
            ...existingPayment,
            amount: grandTotal.toFixed(2),
          });
        }

        const updatedOrder: SalesOrderRow = {
          ...target,
          subtotal: subtotal.toFixed(2),
          coupon_code: syncedTotals.coupon_code?.trim() || null,
          coupon_discount: couponDiscount.toFixed(2),
          wholesale_discount: wholesaleDiscount.toFixed(2),
          tax_total: taxTotal.toFixed(2),
          shipping_fee: shippingFee.toFixed(2),
          grand_total: grandTotal.toFixed(2),
        };

        setFulfillTarget(updatedOrder);
        toast.success('Order items and totals updated.');
        await onAfterChange?.();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : `Failed to update ${dataset.entityName} details.`,
        );
      } finally {
        setSaving(false);
      }
    },
    [
      dataset.defaultPaymentMode,
      dataset.entityName,
      dataset.isTestingFilter,
      fulfillTarget,
      onAfterChange,
      orderType,
      taxMode,
    ],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (dataset.archiveOnDelete) {
        const { error: archiveDeleteError } = await supabase.rpc('archive_and_delete_order', {
          p_order_id: deleteTarget.id,
          p_archived_reason: 'Deleted from admin sales page',
        });
        if (archiveDeleteError) throw archiveDeleteError;
        toast.success(`${dataset.entityNameTitle} archived and deleted.`);
      } else {
        const { error: deleteError } = await supabase
          .from('orders')
          .delete()
          .eq('id', deleteTarget.id)
          .eq('is_testing', dataset.isTestingFilter);
        if (deleteError) throw deleteError;
        toast.success(`${dataset.entityNameTitle} deleted.`);
      }
      setDeleteTarget(null);
      await onAfterChange?.();
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to delete ${dataset.entityName}.`,
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    dataset.archiveOnDelete,
    dataset.entityName,
    dataset.entityNameTitle,
    dataset.isTestingFilter,
    deleteTarget,
    onAfterChange,
  ]);

  const enrichOrderWithPaymentStatus = useCallback(async (order: SalesOrderRow) => {
    const paymentMap = await fetchPaymentStatusByOrderIds([order.id]);
    return {
      ...order,
      payment_status: paymentMap.get(order.id) ?? 'unpaid',
    } as SalesOrderRow;
  }, []);

  return {
    saving,
    deleteTarget,
    setDeleteTarget,
    fulfillTarget,
    setFulfillTarget,
    handleFulfillStatusChange,
    handleFulfillCancel,
    handleFulfillSaveDetails,
    handleDelete,
    enrichOrderWithPaymentStatus,
  };
}
