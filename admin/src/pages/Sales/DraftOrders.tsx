import { DashboardLayout } from '@/components/layout';
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
import { Button } from '@/components/ui/button';
import { RefreshTableButton } from '@/components/ui/refresh-table-button';
import { Pagination } from '@/components/ui/pagination';
import { useBulkRowSelection } from '@/hooks/useBulkRowSelection';
import { useTablePagination } from '@/hooks/useTablePagination';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { fetchCommerceTaxSettings } from '@/lib/commerce-tax';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  defaultOrderAddressFields,
  type OrderAddressDbFields,
} from './salesOrderB2b';
import { SalesOrderAddressEditor } from './SalesOrderAddressEditor';
import { SalesOrderItemsEditor } from './SalesOrderItemsEditor';
import {
  SalesOrderFormField,
  SalesOrderFormSection,
  salesOrderFormGridClass,
} from './SalesOrderFormField';
import { fulfillmentMethodLabel } from './salesOrderFulfillment';
import {
  DRAFT_ORDER_COLUMNS,
  DRAFT_STALE_PERIOD_OPTIONS,
  fetchOrderItems,
  formatTargetDateDisplay,
  fromDatetimeLocalValue,
  isDraftOrderStale,
  mapDbItemToForm,
  replaceOrderItems,
  toDatetimeLocalValue,
} from './salesOrderDb';
import {
  defaultFulfillmentForOrderType,
  emptyOrderItem,
  FULFILLMENT_TYPE_OPTIONS,
  orderAddressFromForm,
  pickOrderAddressFields,
  validateOrderItems,
  type FulfillmentType,
  type SalesOrderItemForm,
} from './salesOrderShared';
import { useSalesOrderType } from './useSalesOrderType';
import type { DraftStalePeriod } from './salesOrderDb';

type DraftOrderRow = {
  id: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  store_id: number | null;
  requested_fulfillment_method: FulfillmentType;
  requested_target_date: string | null;
  requested_pick_up_store_id: number | null;
  subtotal: string | null;
  coupon_code: string | null;
  coupon_discount: string | null;
  wholesale_discount: string | null;
  tax_total: string | null;
  shipping_fee: string | null;
  grand_total: string | null;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
} & OrderAddressDbFields;

type DraftOrderForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  store_id: number | null;
  requested_fulfillment_method: FulfillmentType;
  requested_target_date: string;
  requested_pick_up_store_id: number | null;
  subtotal: string;
  coupon_code: string;
  coupon_discount: string;
  wholesale_discount: string;
  tax_total: string;
  shipping_fee: string;
  grand_total: string;
  notes: string;
  items: SalesOrderItemForm[];
  expires_at: string;
} & OrderAddressDbFields;

function emptyDraftOrderForm(orderType: string): DraftOrderForm {
  return {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    store_id: null,
    requested_fulfillment_method: defaultFulfillmentForOrderType(orderType),
    requested_target_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    requested_pick_up_store_id: null,
    subtotal: '0.00',
    coupon_code: '',
    coupon_discount: '0.00',
    wholesale_discount: '0.00',
    tax_total: '0.00',
    shipping_fee: '0.00',
    grand_total: '0.00',
    notes: '',
    items: [],
    expires_at: '',
    ...defaultOrderAddressFields(),
  };
}

function syncDraftTotals(
  form: DraftOrderForm,
  tax: { isGstInclusive: boolean } = { isGstInclusive: true },
): DraftOrderForm {
  const subtotal = form.items.reduce((sum, item) => {
    const qty = Number(item.qty);
    const unitPrice = Number(item.unit_price);
    if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return sum;
    return sum + qty * unitPrice;
  }, 0);
  const couponDiscount = Number(form.coupon_discount) || 0;
  const wholesaleDiscount = Number(form.wholesale_discount) || 0;
  const shippingFee = Number(form.shipping_fee) || 0;
  const taxTotal = tax.isGstInclusive ? 0 : Number(form.tax_total) || 0;
  return {
    ...form,
    subtotal: subtotal.toFixed(2),
    tax_total: tax.isGstInclusive ? '0.00' : taxTotal.toFixed(2),
    grand_total: Math.max(
      subtotal - couponDiscount - wholesaleDiscount + taxTotal + shippingFee,
      0,
    ).toFixed(2),
  };
}

function draftRowToForm(
  row: DraftOrderRow,
  items: SalesOrderItemForm[],
  tax: { isGstInclusive: boolean } = { isGstInclusive: true },
): DraftOrderForm {
  return syncDraftTotals({
    customer_name: row.customer_name ?? '',
    customer_email: row.customer_email ?? '',
    customer_phone: row.customer_phone ?? '',
    store_id: row.store_id,
    requested_fulfillment_method: row.requested_fulfillment_method,
    requested_target_date: row.requested_target_date ?? new Date().toISOString(),
    requested_pick_up_store_id: row.requested_pick_up_store_id,
    subtotal: row.subtotal ? String(row.subtotal) : '0.00',
    coupon_code: row.coupon_code ?? '',
    coupon_discount: row.coupon_discount ? String(row.coupon_discount) : '0.00',
    wholesale_discount: row.wholesale_discount ? String(row.wholesale_discount) : '0.00',
    tax_total: row.tax_total ? String(row.tax_total) : '0.00',
    shipping_fee: row.shipping_fee ? String(row.shipping_fee) : '0.00',
    grand_total: row.grand_total ? String(row.grand_total) : '0.00',
    notes: row.notes ?? '',
    items,
    expires_at: row.expires_at ?? '',
    ...pickOrderAddressFields(row),
  }, tax);
}

export function DraftOrders() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';
  const { orderType, pageTitle, tableTitle, redirectTo } = useSalesOrderType(
    'draft-orders',
    'Draft Orders',
  );

  const [rows, setRows] = useState<DraftOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DraftOrderForm>(() =>
    emptyDraftOrderForm(orderType ?? 'pickup'),
  );
  const [deleteTarget, setDeleteTarget] = useState<DraftOrderRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [stalePeriod, setStalePeriod] = useState<DraftStalePeriod>('48h');
  const [isGstInclusive, setIsGstInclusive] = useState(true);
  const taxMode = useMemo(() => ({ isGstInclusive }), [isGstInclusive]);

  useEffect(() => {
    void fetchCommerceTaxSettings()
      .then((settings) => setIsGstInclusive(settings.isGstInclusive))
      .catch(() => setIsGstInclusive(true));
  }, []);

  const loadRows = useCallback(async () => {
    if (!orderType) return;

    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('draft_orders')
        .select(DRAFT_ORDER_COLUMNS)
        .eq('order_type', orderType)
        .order('id', { ascending: false });
      if (fetchError) throw fetchError;
      setRows((data ?? []) as DraftOrderRow[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load draft orders.';
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orderType]);

  useEffect(() => {
    if (isAdmin && orderType) {
      void loadRows();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadRows, orderType]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      return (
        String(row.id).includes(term) ||
        (row.customer_name ?? '').toLowerCase().includes(term) ||
        (row.customer_email ?? '').toLowerCase().includes(term) ||
        (row.customer_phone ?? '').toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  const {
    paginatedItems: paginatedRows,
    page,
    perPage,
    totalPages,
    totalRecords,
    perPageOptions,
    setPage,
    onPerPageChange,
  } = useTablePagination(filteredRows, search);

  const {
    selectedIds,
    selectedCount,
    selectAllRef,
    allFilteredSelected,
    toggleSelected,
    toggleSelectAllFiltered,
    clearSelection,
    removeFromSelection,
  } = useBulkRowSelection(filteredRows);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyDraftOrderForm(orderType ?? 'pickup'));
    setDialogOpen(true);
  };

  const openEdit = async (row: DraftOrderRow) => {
    setSaving(true);
    try {
      const itemRows = await fetchOrderItems(row.id);
      const items = itemRows.map((item) => mapDbItemToForm(item));
      setEditingId(row.id);
      setForm(draftRowToForm(row, items, taxMode));
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load draft order.');
    } finally {
      setSaving(false);
    }
  };

  const applyItemsChange = (items: SalesOrderItemForm[]) => {
    setForm((prev) => syncDraftTotals({ ...prev, items }, taxMode));
  };

  const handleSave = async () => {
    if (!orderType) return;

    let parsedItems: SalesOrderItemForm[];
    try {
      parsedItems = form.items.length > 0 ? validateOrderItems(form.items) : [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid line items.');
      return;
    }

    const synced = syncDraftTotals({ ...form, items: parsedItems }, taxMode);

    const targetDate = new Date(synced.requested_target_date);
    if (Number.isNaN(targetDate.getTime())) {
      toast.error('Target date must be valid.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        order_type: orderType,
        status: 'awaiting_payment' as const,
        customer_name: synced.customer_name.trim() || null,
        customer_email: synced.customer_email.trim() || null,
        customer_phone: synced.customer_phone.trim() || null,
        store_id: synced.store_id,
        requested_fulfillment_method: synced.requested_fulfillment_method,
        requested_target_date: targetDate.toISOString(),
        requested_pick_up_store_id: synced.requested_pick_up_store_id,
        ...orderAddressFromForm(synced),
        subtotal: Number(synced.subtotal).toFixed(2),
        coupon_code: synced.coupon_code.trim() || null,
        coupon_discount: Number(synced.coupon_discount).toFixed(2),
        wholesale_discount: Number(synced.wholesale_discount).toFixed(2),
        tax_total: Number(synced.tax_total).toFixed(2),
        shipping_fee: Number(synced.shipping_fee).toFixed(2),
        grand_total: Number(synced.grand_total).toFixed(2),
        notes: synced.notes.trim() || null,
        expires_at: form.expires_at.trim() || null,
      };

      let targetId = editingId;

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('draft_orders')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (updateError) throw updateError;
        toast.success('Draft order updated.');
      } else {
        const nowIso = new Date().toISOString();
        const { data: inserted, error: insertError } = await supabase
          .from('draft_orders')
          .insert({
            ...payload,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select('id')
          .single();
        if (insertError || !inserted) {
          throw insertError ?? new Error('Failed to create draft order.');
        }
        targetId = inserted.id as number;
        toast.success('Draft order created.');
      }

      if (targetId) {
        await replaceOrderItems(targetId, orderType, parsedItems);
      }

      setDialogOpen(false);
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save draft order.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('draft_orders')
        .delete()
        .eq('id', deleteTarget.id);
      if (deleteError) throw deleteError;
      toast.success('Draft order deleted.');
      removeFromSelection(deleteTarget.id);
      setDeleteTarget(null);
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete draft order.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('draft_orders')
        .delete()
        .in('id', ids);
      if (deleteError) throw deleteError;
      toast.success(
        `Deleted ${ids.length} draft ${ids.length === 1 ? 'order' : 'orders'}.`,
      );
      clearSelection();
      setBulkDeleteOpen(false);
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete draft orders.');
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
            <CardDescription>Only administrators can manage draft orders.</CardDescription>
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
              <CardDescription>Manage unpaid or abandoned checkout drafts.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadRows()}
                disabled={loading}
              />
              <Button onClick={openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add draft
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Input
                  placeholder="Search by ID, customer, email or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="draft-stale-period" className="whitespace-nowrap">
                    Stale after
                  </Label>
                  <Select
                    value={stalePeriod}
                    onValueChange={(value) => setStalePeriod(value as DraftStalePeriod)}
                  >
                    <SelectTrigger id="draft-stale-period" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DRAFT_STALE_PERIOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedCount > 0 ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="shrink-0 self-end sm:self-auto"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={saving}
                >
                  <Trash2 className="size-4" />
                  Delete {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
                </Button>
              ) : null}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No draft orders found.</p>
            ) : (
              <div className="space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 px-4 py-3">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={allFilteredSelected}
                          disabled={saving || filteredRows.length === 0}
                          aria-label="Select all visible draft orders"
                          onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Order date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Target date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Expires</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => {
                      const stale = isDraftOrderStale(row.updated_at, stalePeriod);
                      return (
                      <tr
                        key={row.id}
                        className={`border-b transition-colors hover:bg-muted/50 ${
                          stale
                            ? 'bg-amber-50 dark:bg-amber-950/25'
                            : selectedIds.has(row.id)
                              ? 'bg-muted/30'
                              : ''
                        } ${stale && selectedIds.has(row.id) ? 'ring-1 ring-inset ring-amber-300/70 dark:ring-amber-700/50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={selectedIds.has(row.id)}
                            disabled={saving}
                            aria-label={`Select draft order ${row.id}`}
                            onChange={(e) => toggleSelected(row.id, e.target.checked)}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{row.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium">{row.customer_name ?? '-'}</p>
                          <p className="text-muted-foreground">{row.customer_email ?? '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatTargetDateDisplay(row.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatTargetDateDisplay(row.requested_target_date)}
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums">
                          {row.grand_total ? `$${Number(row.grand_total).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {row.expires_at ? new Date(row.expires_at).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void openEdit(row)}
                              disabled={saving}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(row)}
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                totalRecords={totalRecords}
                page={page}
                perPage={perPage}
                totalPages={totalPages}
                perPageOptions={perPageOptions}
                onPageChange={setPage}
                onPerPageChange={onPerPageChange}
              />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? 'Edit draft order' : 'Add draft order'}</DialogTitle>
            <DialogDescription>Draft data used before payment completion.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-2 pr-1">
            <SalesOrderFormSection title="Customer contact">
              <div className={salesOrderFormGridClass}>
                <SalesOrderFormField label="Customer name" htmlFor="draft-customer-name">
                  <Input
                    id="draft-customer-name"
                    value={form.customer_name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, customer_name: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Customer email" htmlFor="draft-customer-email">
                  <Input
                    id="draft-customer-email"
                    type="email"
                    value={form.customer_email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, customer_email: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Customer phone" htmlFor="draft-customer-phone">
                  <Input
                    id="draft-customer-phone"
                    value={form.customer_phone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, customer_phone: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Store ID" htmlFor="draft-store-id">
                  <Input
                    id="draft-store-id"
                    type="number"
                    value={form.store_id ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        store_id: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </SalesOrderFormField>
              </div>
            </SalesOrderFormSection>

            <SalesOrderFormSection title="Fulfillment & totals">
              <div className={salesOrderFormGridClass}>
                <SalesOrderFormField label="Fulfillment method" htmlFor="draft-fulfillment">
                  <Select
                    value={form.requested_fulfillment_method}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        requested_fulfillment_method: value as FulfillmentType,
                        requested_pick_up_store_id:
                          value === 'pick_up' ? prev.requested_pick_up_store_id : null,
                      }))
                    }
                  >
                    <SelectTrigger id="draft-fulfillment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FULFILLMENT_TYPE_OPTIONS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {fulfillmentMethodLabel(method)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SalesOrderFormField>
                <SalesOrderFormField label="Target date" htmlFor="draft-target-date">
                  <Input
                    id="draft-target-date"
                    type="datetime-local"
                    value={toDatetimeLocalValue(form.requested_target_date)}
                    onChange={(e) => {
                      const iso = fromDatetimeLocalValue(e.target.value);
                      if (iso) {
                        setForm((prev) => ({ ...prev, requested_target_date: iso }));
                      }
                    }}
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Coupon code" htmlFor="draft-coupon-code">
                  <Input
                    id="draft-coupon-code"
                    value={form.coupon_code}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, coupon_code: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Coupon discount" htmlFor="draft-coupon-discount">
                  <Input
                    id="draft-coupon-discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.coupon_discount}
                    onChange={(e) =>
                      setForm((prev) =>
                        syncDraftTotals({ ...prev, coupon_discount: e.target.value }, taxMode),
                      )
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Wholesale discount" htmlFor="draft-wholesale-discount">
                  <Input
                    id="draft-wholesale-discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.wholesale_discount}
                    onChange={(e) =>
                      setForm((prev) =>
                        syncDraftTotals({ ...prev, wholesale_discount: e.target.value }, taxMode),
                      )
                    }
                  />
                </SalesOrderFormField>
                {!isGstInclusive ? (
                  <SalesOrderFormField label="Tax total" htmlFor="draft-tax-total">
                    <Input
                      id="draft-tax-total"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.tax_total}
                      onChange={(e) =>
                        setForm((prev) =>
                          syncDraftTotals({ ...prev, tax_total: e.target.value }, taxMode),
                        )
                      }
                    />
                  </SalesOrderFormField>
                ) : null}
                <SalesOrderFormField label="Shipping fee" htmlFor="draft-shipping">
                  <Input
                    id="draft-shipping"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.shipping_fee}
                    onChange={(e) =>
                      setForm((prev) => syncDraftTotals({ ...prev, shipping_fee: e.target.value }, taxMode))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Grand total" htmlFor="draft-grand-total">
                  <Input
                    id="draft-grand-total"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.grand_total}
                    readOnly
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Expires at" htmlFor="draft-expires-at">
                  <Input
                    id="draft-expires-at"
                    value={form.expires_at}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, expires_at: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
              </div>
            </SalesOrderFormSection>

            <SalesOrderAddressEditor
              idPrefix="draft-order"
              fulfillmentMethod={form.requested_fulfillment_method}
              requestedPickUpStoreId={form.requested_pick_up_store_id}
              onPickupStoreChange={(storeId) =>
                setForm((prev) => ({ ...prev, requested_pick_up_store_id: storeId }))
              }
              value={pickOrderAddressFields(form)}
              onChange={(address) => setForm((prev) => ({ ...prev, ...address }))}
              disabled={saving}
            />

            <SalesOrderFormSection title="Notes">
              <SalesOrderFormField label="Order notes" htmlFor="draft-notes">
                <Textarea
                  id="draft-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </SalesOrderFormField>
            </SalesOrderFormSection>

            <SalesOrderFormSection title="Line items">
              <div className="mb-4 flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      items: [...prev.items, emptyOrderItem()],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add line item
                </Button>
              </div>
              <SalesOrderItemsEditor
                orderType={orderType!}
                items={form.items}
                onItemsChange={applyItemsChange}
                idPrefix="draft-order"
                disabled={saving}
              />
            </SalesOrderFormSection>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft order?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes draft order <strong>#{deleteTarget?.id}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} draft {selectedCount === 1 ? 'order' : 'orders'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {selectedCount} draft{' '}
              {selectedCount === 1 ? 'order' : 'orders'}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
