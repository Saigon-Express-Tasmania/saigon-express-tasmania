import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { fetchCommerceTaxSettings } from '@/lib/commerce-tax';
import { useSalesOrderMode } from '@/contexts/SalesOrderModeContext';
import { Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SalesOrderDeleteDialog } from './SalesOrderDeleteDialog';
import { SalesOrderEditorDialog } from './SalesOrderEditorDialog';
import { SalesOrderFulfillmentDialog } from './SalesOrderFulfillmentDialog';
import { SalesOrdersTable } from './SalesOrdersTable';
import { serializeB2BForDb } from './salesOrderB2b';
import {
  fetchPaymentStatusByOrderIds,
  replaceOrderItems,
  saveOrderPayment,
} from './salesOrderDb';
import {
  emptyOrderForm,
  loadOrderForm,
  orderAddressFromForm,
  parsePaymentTerms,
  syncTotalsFromItems,
  validateOrderItems,
  SALES_ORDER_COLUMNS,
  type SalesOrderForm,
  type SalesOrderRow,
  type SalesOrdersDataset,
} from './salesOrderShared';
import { salesOrderDetailsLink } from './orderType';
import { useSalesOrderType } from './useSalesOrderType';
import { useSalesOrderRowActions } from './useSalesOrderRowActions';

type SalesOrdersManagerProps = {
  dataset: SalesOrdersDataset;
};

export function SalesOrdersManager({ dataset }: SalesOrdersManagerProps) {
  const navigate = useNavigate();
  const { mode } = useSalesOrderMode();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';
  const { orderType, pageTitle, tableTitle, redirectTo } = useSalesOrderType(
    'orders',
    dataset.pageLabel,
  );

  const [orders, setOrders] = useState<SalesOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [form, setForm] = useState<SalesOrderForm>(() =>
    emptyOrderForm(dataset.defaultPaymentMode, orderType ?? 'pickup'),
  );

  const [isGstInclusive, setIsGstInclusive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    void fetchCommerceTaxSettings()
      .then((settings) => setIsGstInclusive(settings.isGstInclusive))
      .catch(() => setIsGstInclusive(true));
  }, []);

  const taxMode = useMemo(() => ({ isGstInclusive }), [isGstInclusive]);

  const loadOrders = useCallback(async () => {
    if (!orderType) return;

    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(SALES_ORDER_COLUMNS)
        .eq('order_type', orderType)
        .eq('is_testing', dataset.isTestingFilter)
        .order('id', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as SalesOrderRow[];
      const paymentMap = await fetchPaymentStatusByOrderIds(rows.map((row) => row.id));
      setOrders(
        rows.map((row) => ({
          ...row,
          payment_status: paymentMap.get(row.id) ?? 'unpaid',
        })),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to load ${dataset.entityName}s.`;
      setError(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [dataset.entityName, dataset.isTestingFilter, orderType]);

  const {
    saving: actionSaving,
    deleteTarget,
    setDeleteTarget,
    fulfillTarget,
    setFulfillTarget,
    handleFulfillStatusChange,
    handleFulfillCancel,
    handleFulfillSaveDetails,
    handleDelete,
  } = useSalesOrderRowActions({
    dataset,
    orderType: orderType ?? 'pickup',
    isGstInclusive,
    onAfterChange: loadOrders,
  });

  const saving = formSaving || actionSaving;

  useEffect(() => {
    if (isAdmin && orderType) {
      void loadOrders();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadOrders, orderType]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => {
      return (
        String(order.id).includes(term) ||
        order.customer_name.toLowerCase().includes(term) ||
        order.customer_email.toLowerCase().includes(term) ||
        order.customer_phone.toLowerCase().includes(term)
      );
    });
  }, [orders, search]);

  const openCreate = () => {
    setEditingOrderId(null);
    setForm(emptyOrderForm(dataset.defaultPaymentMode, orderType ?? 'pickup'));
    setDialogOpen(true);
  };

  const openEditDialog = async (order: SalesOrderRow) => {
    setFormSaving(true);
    try {
      const loadedForm = await loadOrderForm(order, dataset.defaultPaymentMode);
      setEditingOrderId(order.id);
      setForm(loadedForm);
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to load ${dataset.entityName} details.`,
      );
    } finally {
      setFormSaving(false);
    }
  };

  const handleView = (order: SalesOrderRow) => {
    if (!orderType) return;
    navigate(salesOrderDetailsLink(mode, orderType, order.id));
  };

  const handleSave = async () => {
    if (!orderType) return;

    if (!form.customer_name.trim()) {
      toast.error('Customer name is required.');
      return;
    }
    if (!form.customer_email.trim()) {
      toast.error('Customer email is required.');
      return;
    }
    if (!form.customer_phone.trim()) {
      toast.error('Customer phone is required.');
      return;
    }
    if (!form.requested_target_date.trim()) {
      toast.error('Target date is required.');
      return;
    }

    const targetDate = new Date(form.requested_target_date);
    if (Number.isNaN(targetDate.getTime())) {
      toast.error('Target date must be a valid date and time.');
      return;
    }

    let parsedItems;
    try {
      parsedItems = validateOrderItems(form.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid line items.');
      return;
    }

    const syncedForm = syncTotalsFromItems({ ...form, items: parsedItems }, taxMode);
    const subtotal = Number(syncedForm.subtotal);
    const couponDiscount = Number(syncedForm.coupon_discount);
    const wholesaleDiscount = Number(syncedForm.wholesale_discount);
    const taxTotal = Number(syncedForm.tax_total);
    const shippingFee = Number(syncedForm.shipping_fee);
    const grandTotal = Number(syncedForm.grand_total);

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

    setFormSaving(true);
    try {
      const b2bPayload = serializeB2BForDb(syncedForm.b2b, orderType);
      const billingTerms = syncedForm.b2b.billing_address.payment_terms;
      const addressPayload =
        orderType === 'wholesale'
          ? b2bPayload
          : orderAddressFromForm(syncedForm);

      const orderPayload = {
        order_type: orderType,
        customer_account: syncedForm.customer_account?.trim() || null,
        customer_name: syncedForm.customer_name.trim(),
        customer_email: syncedForm.customer_email.trim(),
        customer_phone: syncedForm.customer_phone.trim(),
        store_id: syncedForm.store_id,
        requested_fulfillment_method: syncedForm.requested_fulfillment_method,
        requested_pick_up_store_id: syncedForm.requested_pick_up_store_id,
        requested_target_date: targetDate.toISOString(),
        payment_terms: billingTerms.trim()
          ? parsePaymentTerms(billingTerms)
          : syncedForm.payment_terms,
        po_number: syncedForm.po_number?.trim() || null,
        subtotal: subtotal.toFixed(2),
        coupon_code: syncedForm.coupon_code?.trim() || null,
        coupon_discount: couponDiscount.toFixed(2),
        wholesale_discount: wholesaleDiscount.toFixed(2),
        tax_total: taxTotal.toFixed(2),
        shipping_fee: shippingFee.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        status: syncedForm.status,
        notes: syncedForm.notes?.trim() || null,
        cancel_token: syncedForm.cancel_token?.trim() || null,
        tracking_token: syncedForm.tracking_token?.trim() || null,
        status_updated_at: syncedForm.status_updated_at || null,
        is_testing: dataset.isTestingFilter,
        ...addressPayload,
      };

      let targetOrderId = editingOrderId;

      if (editingOrderId !== null) {
        const { error: updateError } = await supabase
          .from('orders')
          .update(orderPayload)
          .eq('id', editingOrderId)
          .eq('is_testing', dataset.isTestingFilter);
        if (updateError) throw updateError;
      } else {
        const { data: insertedOrder, error: insertError } = await supabase
          .from('orders')
          .insert(orderPayload)
          .select('id')
          .single();
        if (insertError || !insertedOrder) {
          throw insertError ?? new Error(`Failed to create ${dataset.entityName}.`);
        }
        targetOrderId = insertedOrder.id as number;
      }

      if (!targetOrderId) {
        throw new Error(`Could not resolve ${dataset.entityName} id.`);
      }

      await replaceOrderItems(targetOrderId, orderType, parsedItems);
      await saveOrderPayment(targetOrderId, {
        ...syncedForm.payment,
        amount: grandTotal.toFixed(2),
        mode: syncedForm.payment.mode ?? dataset.defaultPaymentMode,
      });

      toast.success(
        editingOrderId !== null
          ? `${dataset.entityNameTitle} updated.`
          : `${dataset.entityNameTitle} created.`,
      );
      setDialogOpen(false);
      await loadOrders();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to save ${dataset.entityName}.`,
      );
    } finally {
      setFormSaving(false);
    }
  };

  if (redirectTo) return <Navigate to={redirectTo} replace />;

  if (profileLoading) {
    return (
      <DashboardLayout title={pageTitle}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title={pageTitle}>
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage {dataset.entityName}s.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={pageTitle}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{tableTitle}</CardTitle>
              <CardDescription>{dataset.tableDescription}</CardDescription>
            </div>
            <Button onClick={openCreate} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              {dataset.addButtonLabel}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Input
              placeholder="Search by ID, customer, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dataset.emptyMessage}</p>
            ) : (
              <SalesOrdersTable
                orders={filteredOrders}
                orderType={orderType ?? undefined}
                saving={saving}
                onView={handleView}
                onEdit={(order) => void openEditDialog(order)}
                onFulfill={setFulfillTarget}
                onDelete={setDeleteTarget}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <SalesOrderEditorDialog
        dataset={dataset}
        orderType={orderType!}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingOrderId={editingOrderId}
        form={form}
        onFormChange={setForm}
        saving={saving}
        onSave={() => void handleSave()}
        isGstInclusive={isGstInclusive}
      />

      <SalesOrderDeleteDialog
        dataset={dataset}
        target={deleteTarget}
        saving={saving}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />

      <SalesOrderFulfillmentDialog
        order={fulfillTarget}
        saving={saving}
        isGstInclusive={isGstInclusive}
        onOpenChange={(open) => !open && setFulfillTarget(null)}
        onStatusChange={handleFulfillStatusChange}
        onCancelOrder={handleFulfillCancel}
        onSaveDetails={(orderId, details) => void handleFulfillSaveDetails(orderId, details)}
      />
    </DashboardLayout>
  );
}
