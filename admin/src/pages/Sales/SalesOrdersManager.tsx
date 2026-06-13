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
import { Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SalesOrderDeleteDialog } from './SalesOrderDeleteDialog';
import { SalesOrderEditorDialog } from './SalesOrderEditorDialog';
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
import { useSalesOrderType } from './useSalesOrderType';

type SalesOrdersManagerProps = {
  dataset: SalesOrdersDataset;
};

export function SalesOrdersManager({ dataset }: SalesOrdersManagerProps) {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';
  const { orderType, pageTitle, tableTitle, redirectTo } = useSalesOrderType(
    'orders',
    dataset.pageLabel,
  );

  const [orders, setOrders] = useState<SalesOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogReadOnly, setDialogReadOnly] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [form, setForm] = useState<SalesOrderForm>(() =>
    emptyOrderForm(dataset.defaultPaymentMode, orderType ?? 'pickup'),
  );

  const [deleteTarget, setDeleteTarget] = useState<SalesOrderRow | null>(null);

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
    setDialogReadOnly(false);
    setForm(emptyOrderForm(dataset.defaultPaymentMode, orderType ?? 'pickup'));
    setDialogOpen(true);
  };

  const openOrderDialog = async (order: SalesOrderRow, readOnly: boolean) => {
    setSaving(true);
    try {
      const loadedForm = await loadOrderForm(order, dataset.defaultPaymentMode);
      setEditingOrderId(order.id);
      setDialogReadOnly(readOnly);
      setForm(loadedForm);
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to load ${dataset.entityName} details.`,
      );
    } finally {
      setSaving(false);
    }
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

    const syncedForm = syncTotalsFromItems({ ...form, items: parsedItems });
    const subtotal = Number(syncedForm.subtotal);
    const taxTotal = Number(syncedForm.tax_total);
    const shippingFee = Number(syncedForm.shipping_fee);
    const grandTotal = Number(syncedForm.grand_total);

    if (
      !Number.isFinite(subtotal) ||
      !Number.isFinite(taxTotal) ||
      !Number.isFinite(shippingFee) ||
      !Number.isFinite(grandTotal) ||
      subtotal < 0 ||
      taxTotal < 0 ||
      shippingFee < 0 ||
      grandTotal < 0
    ) {
      toast.error('Order totals must be valid non-negative numbers.');
      return;
    }

    setSaving(true);
    try {
      const b2bPayload = serializeB2BForDb(syncedForm.b2b, orderType);
      const billingTerms = syncedForm.b2b.billing_address.payment_terms;
      const addressPayload =
        orderType === 'wholesale'
          ? b2bPayload
          : {
              ...orderAddressFromForm(syncedForm),
              financial_details: null,
            };

      const orderPayload = {
        order_type: orderType,
        customer_name: syncedForm.customer_name.trim(),
        customer_email: syncedForm.customer_email.trim(),
        customer_phone: syncedForm.customer_phone.trim(),
        store_id: syncedForm.store_id,
        requested_fulfillment_method: syncedForm.requested_fulfillment_method,
        requested_target_date: targetDate.toISOString(),
        payment_terms: billingTerms.trim()
          ? parsePaymentTerms(billingTerms)
          : syncedForm.payment_terms,
        po_number: syncedForm.po_number?.trim() || null,
        subtotal: subtotal.toFixed(2),
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
      setSaving(false);
    }
  };

  const handleDelete = async () => {
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
      await loadOrders();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to delete ${dataset.entityName}.`,
      );
    } finally {
      setSaving(false);
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
                saving={saving}
                onView={(order) => void openOrderDialog(order, true)}
                onEdit={(order) => void openOrderDialog(order, false)}
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
        readOnly={dialogReadOnly}
        form={form}
        onFormChange={setForm}
        saving={saving}
        onSave={() => void handleSave()}
      />

      <SalesOrderDeleteDialog
        dataset={dataset}
        target={deleteTarget}
        saving={saving}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </DashboardLayout>
  );
}
