import { DashboardLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Pencil } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SalesOrderAddressEditor } from './SalesOrderAddressEditor';
import { SalesOrderItemsEditor } from './SalesOrderItemsEditor';
import {
  SalesOrderFormField,
  SalesOrderFormSection,
  salesOrderFormGridClass,
} from './SalesOrderFormField';
import { formatOrderStatusLabel, fulfillmentMethodLabel } from './salesOrderFulfillment';
import type { OrderAddressDbFields } from './salesOrderB2b';
import {
  ARCHIVED_ORDER_COLUMNS,
  fetchOrderItems,
  fetchPaymentStatusByOrderIds,
  formatTargetDateDisplay,
  fromDatetimeLocalValue,
  mapDbItemToForm,
  toDatetimeLocalValue,
} from './salesOrderDb';
import {
  FULFILLMENT_TYPE_OPTIONS,
  ORDER_STATUS_OPTIONS,
  orderAddressFromForm,
  pickOrderAddressFields,
  PAYMENT_TERMS_OPTIONS,
  type FulfillmentType,
  type OrderStatus,
  type PaymentStatus,
  type PaymentTerms,
  type SalesOrderItemForm,
} from './salesOrderShared';
import { useSalesOrderType } from './useSalesOrderType';

type ArchivedOrderRow = {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  store_id: number | null;
  requested_fulfillment_method: FulfillmentType;
  requested_target_date: string;
  requested_pick_up_store_id: number | null;
  payment_terms: PaymentTerms;
  po_number: string | null;
  subtotal: string;
  tax_total: string;
  shipping_fee: string;
  grand_total: string;
  status: OrderStatus;
  notes: string | null;
  archived_reason: string | null;
  archived_at: string;
  created_at: string;
  updated_at: string;
  payment_status?: PaymentStatus;
} & OrderAddressDbFields;

type ArchivedOrderForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  store_id: number | null;
  requested_fulfillment_method: FulfillmentType;
  requested_target_date: string;
  requested_pick_up_store_id: number | null;
  payment_terms: PaymentTerms;
  po_number: string;
  subtotal: string;
  tax_total: string;
  shipping_fee: string;
  grand_total: string;
  status: OrderStatus;
  notes: string;
  archived_reason: string;
  archived_at: string;
  items: SalesOrderItemForm[];
} & OrderAddressDbFields;

function archivedRowToForm(row: ArchivedOrderRow, items: SalesOrderItemForm[]): ArchivedOrderForm {
  return {
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    store_id: row.store_id,
    requested_fulfillment_method: row.requested_fulfillment_method,
    requested_target_date: row.requested_target_date,
    requested_pick_up_store_id: row.requested_pick_up_store_id,
    payment_terms: row.payment_terms,
    po_number: row.po_number ?? '',
    subtotal: String(row.subtotal),
    tax_total: String(row.tax_total),
    shipping_fee: String(row.shipping_fee),
    grand_total: String(row.grand_total),
    status: row.status,
    notes: row.notes ?? '',
    archived_reason: row.archived_reason ?? '',
    archived_at: row.archived_at,
    items,
    ...pickOrderAddressFields(row),
  };
}

export function ArchivedOrders() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';
  const { orderType, pageTitle, tableTitle, redirectTo } = useSalesOrderType(
    'archived-orders',
    'Archived Orders',
  );

  const formatPaymentTermsLabel = (terms: PaymentTerms): string => {
    const labels: Record<PaymentTerms, string> = {
      prepaid: 'Prepaid',
      due_on_receipt: 'Due on receipt',
      deposit_required: 'Deposit required',
      net_30: 'Net 30',
      net_60: 'Net 60',
      net_90: 'Net 90',
    };
    return labels[terms];
  };

  const [rows, setRows] = useState<ArchivedOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ArchivedOrderForm | null>(null);

  const loadRows = useCallback(async () => {
    if (!orderType) return;

    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('archived_orders')
        .select(ARCHIVED_ORDER_COLUMNS)
        .eq('order_type', orderType)
        .order('archived_at', { ascending: false });
      if (fetchError) throw fetchError;

      const baseRows = (data ?? []) as ArchivedOrderRow[];
      const paymentMap = await fetchPaymentStatusByOrderIds(baseRows.map((row) => row.id));
      setRows(
        baseRows.map((row) => ({
          ...row,
          payment_status: paymentMap.get(row.id) ?? 'unpaid',
        })),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load archived orders.';
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
        row.customer_name.toLowerCase().includes(term) ||
        row.customer_email.toLowerCase().includes(term) ||
        row.customer_phone.toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  const openEdit = async (row: ArchivedOrderRow) => {
    setSaving(true);
    try {
      const itemRows = await fetchOrderItems(row.id);
      const items = itemRows.map((item) => mapDbItemToForm(item));
      setEditingId(row.id);
      setForm(archivedRowToForm(row, items));
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load archived order.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!orderType || !form || editingId === null) return;

    const subtotal = Number(form.subtotal);
    const taxTotal = Number(form.tax_total);
    const shippingFee = Number(form.shipping_fee);
    const grandTotal = Number(form.grand_total);

    if (
      !form.customer_name.trim() ||
      !form.customer_email.trim() ||
      !form.customer_phone.trim()
    ) {
      toast.error('Customer name, email, and phone are required.');
      return;
    }

    if (
      !Number.isFinite(subtotal) ||
      !Number.isFinite(taxTotal) ||
      !Number.isFinite(shippingFee) ||
      !Number.isFinite(grandTotal)
    ) {
      toast.error('Totals must be valid numbers.');
      return;
    }

    const targetDate = new Date(form.requested_target_date);
    if (Number.isNaN(targetDate.getTime())) {
      toast.error('Target date must be valid.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim(),
        customer_phone: form.customer_phone.trim(),
        store_id: form.store_id,
        requested_fulfillment_method: form.requested_fulfillment_method,
        requested_target_date: targetDate.toISOString(),
        requested_pick_up_store_id: form.requested_pick_up_store_id,
        payment_terms: form.payment_terms,
        po_number: form.po_number.trim() || null,
        subtotal: subtotal.toFixed(2),
        tax_total: taxTotal.toFixed(2),
        shipping_fee: shippingFee.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        status: form.status,
        notes: form.notes.trim() || null,
        archived_reason: form.archived_reason.trim() || null,
        archived_at: form.archived_at.trim() || new Date().toISOString(),
        ...orderAddressFromForm(form),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('archived_orders')
        .update(payload)
        .eq('id', editingId);
      if (updateError) throw updateError;

      toast.success('Archived order updated.');
      setDialogOpen(false);
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save archived order.');
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
            <CardDescription>Only administrators can manage archived orders.</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={pageTitle}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{tableTitle}</CardTitle>
              <CardDescription>
                Historical order headers. Line items remain in shared order_items by preserved ID.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Input
              placeholder="Search by order ID, customer, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No archived orders found.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Order ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Target date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Archived at</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3 font-mono text-sm">{row.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium">{row.customer_name}</p>
                          <p className="text-muted-foreground">{row.customer_email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatTargetDateDisplay(row.requested_target_date)}
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums">
                          ${Number(row.grand_total).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{row.status}</Badge>
                            <Badge
                              variant={row.payment_status === 'paid' ? 'default' : 'secondary'}
                            >
                              {row.payment_status ?? 'unpaid'}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(row.archived_at).toLocaleString()}
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setForm(null);
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit archived order #{editingId}</DialogTitle>
            <DialogDescription>
              Update archived header fields. Line items are read-only and linked by order ID.
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-2 pr-1">
              <SalesOrderFormSection title="Customer contact">
                <div className={salesOrderFormGridClass}>
                  <SalesOrderFormField label="Customer name" htmlFor="arch-customer-name">
                    <Input
                      id="arch-customer-name"
                      value={form.customer_name}
                      onChange={(e) =>
                        setForm((prev) => prev && { ...prev, customer_name: e.target.value })
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField label="Customer email" htmlFor="arch-customer-email">
                    <Input
                      id="arch-customer-email"
                      type="email"
                      value={form.customer_email}
                      onChange={(e) =>
                        setForm((prev) => prev && { ...prev, customer_email: e.target.value })
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField label="Customer phone" htmlFor="arch-customer-phone">
                    <Input
                      id="arch-customer-phone"
                      value={form.customer_phone}
                      onChange={(e) =>
                        setForm((prev) => prev && { ...prev, customer_phone: e.target.value })
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField label="Store ID" htmlFor="arch-store-id">
                    <Input
                      id="arch-store-id"
                      type="number"
                      value={form.store_id ?? ''}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                store_id: e.target.value ? Number(e.target.value) : null,
                              }
                            : prev,
                        )
                      }
                    />
                  </SalesOrderFormField>
                </div>
              </SalesOrderFormSection>

              <SalesOrderFormSection title="Fulfillment & terms">
                <div className={salesOrderFormGridClass}>
                  <SalesOrderFormField label="Fulfillment method" htmlFor="arch-fulfillment">
                    <Select
                      value={form.requested_fulfillment_method}
                      onValueChange={(value) =>
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                requested_fulfillment_method: value as FulfillmentType,
                                requested_pick_up_store_id:
                                  value === 'pick_up' ? prev.requested_pick_up_store_id : null,
                              }
                            : prev,
                        )
                      }
                    >
                      <SelectTrigger id="arch-fulfillment">
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
                  <SalesOrderFormField label="Payment terms" htmlFor="arch-payment-terms">
                    <Select
                      value={form.payment_terms}
                      onValueChange={(value) =>
                        setForm((prev) =>
                          prev ? { ...prev, payment_terms: value as PaymentTerms } : prev,
                        )
                      }
                    >
                      <SelectTrigger id="arch-payment-terms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS_OPTIONS.map((terms) => (
                          <SelectItem key={terms} value={terms}>
                            {formatPaymentTermsLabel(terms)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Target date"
                    htmlFor="arch-target-date"
                    className="md:col-span-2"
                  >
                    <Input
                      id="arch-target-date"
                      type="datetime-local"
                      value={toDatetimeLocalValue(form.requested_target_date)}
                      onChange={(e) => {
                        const iso = fromDatetimeLocalValue(e.target.value);
                        if (iso) {
                          setForm((prev) => prev && { ...prev, requested_target_date: iso });
                        }
                      }}
                    />
                  </SalesOrderFormField>
                </div>
              </SalesOrderFormSection>

              <SalesOrderFormSection title="Totals & status">
                <div className={salesOrderFormGridClass}>
                  <SalesOrderFormField label="Subtotal" htmlFor="arch-subtotal">
                    <Input
                      id="arch-subtotal"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.subtotal}
                      onChange={(e) =>
                        setForm((prev) => prev && { ...prev, subtotal: e.target.value })
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField label="Tax total" htmlFor="arch-tax">
                    <Input
                      id="arch-tax"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.tax_total}
                      onChange={(e) =>
                        setForm((prev) => prev && { ...prev, tax_total: e.target.value })
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField label="Shipping fee" htmlFor="arch-shipping">
                    <Input
                      id="arch-shipping"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.shipping_fee}
                      onChange={(e) =>
                        setForm((prev) => prev && { ...prev, shipping_fee: e.target.value })
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField label="Grand total" htmlFor="arch-grand-total">
                    <Input
                      id="arch-grand-total"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.grand_total}
                      onChange={(e) =>
                        setForm((prev) => prev && { ...prev, grand_total: e.target.value })
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField label="Order status" htmlFor="arch-status">
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((prev) => (prev ? { ...prev, status: value as OrderStatus } : prev))
                      }
                    >
                      <SelectTrigger id="arch-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {formatOrderStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SalesOrderFormField>
                </div>
              </SalesOrderFormSection>

              <SalesOrderFormSection title="Archive metadata">
                <div className={salesOrderFormGridClass}>
                  <SalesOrderFormField label="Archived at" htmlFor="arch-archived-at">
                    <Input
                      id="arch-archived-at"
                      value={form.archived_at}
                      onChange={(e) =>
                        setForm((prev) => prev && { ...prev, archived_at: e.target.value })
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Archived reason"
                    htmlFor="arch-archived-reason"
                    className="md:col-span-2"
                  >
                    <Input
                      id="arch-archived-reason"
                      value={form.archived_reason}
                      onChange={(e) =>
                        setForm((prev) => prev && { ...prev, archived_reason: e.target.value })
                      }
                    />
                  </SalesOrderFormField>
                </div>
              </SalesOrderFormSection>

              <SalesOrderAddressEditor
                idPrefix="archived-order"
                fulfillmentMethod={form.requested_fulfillment_method}
                requestedPickUpStoreId={form.requested_pick_up_store_id}
                onPickupStoreChange={(storeId) =>
                  setForm((prev) => (prev ? { ...prev, requested_pick_up_store_id: storeId } : prev))
                }
                value={pickOrderAddressFields(form)}
                onChange={(address) => setForm((prev) => (prev ? { ...prev, ...address } : prev))}
                disabled={saving}
              />

              <SalesOrderFormSection title="Notes">
                <SalesOrderFormField label="Order notes" htmlFor="arch-notes">
                  <Textarea
                    id="arch-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((prev) => prev && { ...prev, notes: e.target.value })}
                  />
                </SalesOrderFormField>
              </SalesOrderFormSection>

              <SalesOrderFormSection title="Line items (read-only)">
                <SalesOrderItemsEditor
                  orderType={orderType!}
                  items={form.items}
                  onItemsChange={() => undefined}
                  idPrefix="archived-order"
                  disabled
                  readOnly
                />
              </SalesOrderFormSection>
            </div>
          ) : null}
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !form}>
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
    </DashboardLayout>
  );
}
