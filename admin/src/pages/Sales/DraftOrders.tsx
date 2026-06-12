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
  DRAFT_ORDER_COLUMNS,
  fetchOrderItems,
  formatTargetDateDisplay,
  fromDatetimeLocalValue,
  mapDbItemToForm,
  replaceOrderItems,
  toDatetimeLocalValue,
} from './salesOrderDb';
import {
  defaultFulfillmentForOrderType,
  emptyOrderItem,
  FULFILLMENT_TYPE_OPTIONS,
  validateOrderItems,
  type FulfillmentType,
  type SalesOrderItemForm,
} from './salesOrderShared';
import { useSalesOrderType } from './useSalesOrderType';

type DraftOrderRow = {
  id: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  store_id: number | null;
  requested_fulfillment_method: FulfillmentType;
  requested_target_date: string | null;
  subtotal: string | null;
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
  subtotal: string;
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
    subtotal: '0.00',
    tax_total: '0.00',
    shipping_fee: '0.00',
    grand_total: '0.00',
    notes: '',
    items: [],
    expires_at: '',
    ...defaultOrderAddressFields(),
  };
}

function syncDraftTotals(form: DraftOrderForm): DraftOrderForm {
  const subtotal = form.items.reduce((sum, item) => {
    const qty = Number(item.qty);
    const unitPrice = Number(item.unit_price);
    if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return sum;
    return sum + qty * unitPrice;
  }, 0);
  const taxTotal = Number(form.tax_total) || 0;
  const shippingFee = Number(form.shipping_fee) || 0;
  return {
    ...form,
    subtotal: subtotal.toFixed(2),
    grand_total: (subtotal + taxTotal + shippingFee).toFixed(2),
  };
}

function draftRowToForm(row: DraftOrderRow, items: SalesOrderItemForm[]): DraftOrderForm {
  return syncDraftTotals({
    customer_name: row.customer_name ?? '',
    customer_email: row.customer_email ?? '',
    customer_phone: row.customer_phone ?? '',
    store_id: row.store_id,
    requested_fulfillment_method: row.requested_fulfillment_method,
    requested_target_date: row.requested_target_date ?? new Date().toISOString(),
    subtotal: row.subtotal ? String(row.subtotal) : '0.00',
    tax_total: row.tax_total ? String(row.tax_total) : '0.00',
    shipping_fee: row.shipping_fee ? String(row.shipping_fee) : '0.00',
    grand_total: row.grand_total ? String(row.grand_total) : '0.00',
    notes: row.notes ?? '',
    items,
    expires_at: row.expires_at ?? '',
    shipping_address: row.shipping_address,
    shipping_city: row.shipping_city,
    shipping_state: row.shipping_state,
    shipping_postal_code: row.shipping_postal_code,
    shipping_country: row.shipping_country,
    billing_address: row.billing_address,
    billing_city: row.billing_city,
    billing_state: row.billing_state,
    billing_postal_code: row.billing_postal_code,
    billing_country: row.billing_country,
  });
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
      setForm(draftRowToForm(row, items));
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load draft order.');
    } finally {
      setSaving(false);
    }
  };

  const applyItemsChange = (items: SalesOrderItemForm[]) => {
    setForm((prev) => syncDraftTotals({ ...prev, items }));
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

    const synced = syncDraftTotals({ ...form, items: parsedItems });

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
        shipping_address: synced.shipping_address.trim() || 'N/A',
        shipping_city: synced.shipping_city.trim() || 'N/A',
        shipping_state: synced.shipping_state.trim() || 'N/A',
        shipping_postal_code: synced.shipping_postal_code.trim() || '0000',
        shipping_country: synced.shipping_country.trim() || 'Australia',
        billing_address: synced.billing_address.trim() || 'N/A',
        billing_city: synced.billing_city.trim() || 'N/A',
        billing_state: synced.billing_state.trim() || 'N/A',
        billing_postal_code: synced.billing_postal_code.trim() || '0000',
        billing_country: synced.billing_country.trim() || 'Australia',
        subtotal: Number(synced.subtotal).toFixed(2),
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
      setDeleteTarget(null);
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete draft order.');
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
            <Button onClick={openCreate} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add draft
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
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No draft orders found.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Target date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Expires</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3 font-mono text-sm">{row.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium">{row.customer_name ?? '-'}</p>
                          <p className="text-muted-foreground">{row.customer_email ?? '-'}</p>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? 'Edit draft order' : 'Add draft order'}</DialogTitle>
            <DialogDescription>Draft data used before payment completion.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="draft-customer-name">Customer name</Label>
              <Input
                id="draft-customer-name"
                value={form.customer_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customer_name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-customer-email">Customer email</Label>
              <Input
                id="draft-customer-email"
                type="email"
                value={form.customer_email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customer_email: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-customer-phone">Customer phone</Label>
              <Input
                id="draft-customer-phone"
                value={form.customer_phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customer_phone: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-store-id">Store ID</Label>
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-fulfillment">Fulfillment method</Label>
              <Select
                value={form.requested_fulfillment_method}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    requested_fulfillment_method: value as FulfillmentType,
                  }))
                }
              >
                <SelectTrigger id="draft-fulfillment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FULFILLMENT_TYPE_OPTIONS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-target-date">Target date</Label>
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-tax">Tax total</Label>
              <Input
                id="draft-tax"
                type="number"
                min="0"
                step="0.01"
                value={form.tax_total}
                onChange={(e) =>
                  setForm((prev) => syncDraftTotals({ ...prev, tax_total: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-shipping">Shipping fee</Label>
              <Input
                id="draft-shipping"
                type="number"
                min="0"
                step="0.01"
                value={form.shipping_fee}
                onChange={(e) =>
                  setForm((prev) => syncDraftTotals({ ...prev, shipping_fee: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-grand-total">Grand total</Label>
              <Input
                id="draft-grand-total"
                type="number"
                min="0"
                step="0.01"
                value={form.grand_total}
                readOnly
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-expires-at">Expires at (ISO)</Label>
              <Input
                id="draft-expires-at"
                value={form.expires_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, expires_at: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <SalesOrderAddressEditor
                idPrefix="draft-order"
                value={{
                  shipping_address: form.shipping_address,
                  shipping_city: form.shipping_city,
                  shipping_state: form.shipping_state,
                  shipping_postal_code: form.shipping_postal_code,
                  shipping_country: form.shipping_country,
                  billing_address: form.billing_address,
                  billing_city: form.billing_city,
                  billing_state: form.billing_state,
                  billing_postal_code: form.billing_postal_code,
                  billing_country: form.billing_country,
                }}
                onChange={(address) => setForm((prev) => ({ ...prev, ...address }))}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="draft-notes">Notes</Label>
              <Textarea
                id="draft-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
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
            </div>
          </div>
          <DialogFooter>
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
    </DashboardLayout>
  );
}
