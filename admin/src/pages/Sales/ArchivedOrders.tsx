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
import { Loader2, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSalesOrderType } from './useSalesOrderType';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

type ArchivedOrderItem = {
  menuItemId: number;
  qty: number;
  unitPrice: number;
  itemName: string;
};

type ArchivedOrderRow = {
  id: number;
  original_order_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  store_id: number | null;
  pickup_time: string | null;
  total: string | null;
  status: OrderStatus | null;
  payment_status: PaymentStatus | null;
  notes: string | null;
  items: unknown;
  archived_reason: string | null;
  archived_at: string;
  created_at: string;
  updated_at: string;
};

type ArchivedOrderForm = {
  original_order_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  store_id: number | null;
  pickup_time: string;
  total: string;
  status: OrderStatus | null;
  payment_status: PaymentStatus | null;
  notes: string;
  itemsJson: string;
  archived_reason: string;
  archived_at: string;
  created_at: string;
};

const ARCHIVED_ORDER_COLUMNS =
  'id, original_order_id, customer_name, customer_email, customer_phone, store_id, pickup_time, total, status, payment_status, notes, items, archived_reason, archived_at, created_at, updated_at';

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
];
const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ['unpaid', 'paid', 'refunded'];

function emptyArchivedOrderForm(): ArchivedOrderForm {
  const nowIso = new Date().toISOString();
  return {
    original_order_id: null,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    store_id: null,
    pickup_time: '',
    total: '0.00',
    status: null,
    payment_status: null,
    notes: '',
    itemsJson: '[]',
    archived_reason: '',
    archived_at: nowIso,
    created_at: nowIso,
  };
}

function toForm(row: ArchivedOrderRow): ArchivedOrderForm {
  return {
    original_order_id: row.original_order_id,
    customer_name: row.customer_name ?? '',
    customer_email: row.customer_email ?? '',
    customer_phone: row.customer_phone ?? '',
    store_id: row.store_id,
    pickup_time: row.pickup_time ?? '',
    total: row.total ? String(row.total) : '0.00',
    status: row.status,
    payment_status: row.payment_status,
    notes: row.notes ?? '',
    itemsJson: JSON.stringify(row.items ?? [], null, 2),
    archived_reason: row.archived_reason ?? '',
    archived_at: row.archived_at,
    created_at: row.created_at,
  };
}

function parseArchivedItems(itemsJson: string): ArchivedOrderItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(itemsJson);
  } catch {
    throw new Error('Items JSON is invalid.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Items JSON must be an array.');
  }
  return parsed.map((raw) => {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Each item must be an object.');
    }
    const row = raw as Record<string, unknown>;
    const menuItemId = Number(row.menuItemId);
    const qty = Number(row.qty);
    const unitPrice = Number(row.unitPrice);
    const itemName = String(row.itemName ?? '').trim();
    if (!Number.isFinite(menuItemId) || menuItemId <= 0) {
      throw new Error('Each item needs a valid menuItemId.');
    }
    if (!Number.isFinite(qty) || qty < 1) {
      throw new Error('Each item needs qty >= 1.');
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Each item needs unitPrice >= 0.');
    }
    if (!itemName) {
      throw new Error('Each item needs itemName.');
    }
    return { menuItemId, qty, unitPrice, itemName };
  });
}

export function ArchivedOrders() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';
  const { orderType, pageTitle, tableTitle, redirectTo } = useSalesOrderType(
    'archived-orders',
    'Archived Orders',
  );

  const [rows, setRows] = useState<ArchivedOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ArchivedOrderForm>(emptyArchivedOrderForm());

  const loadRows = useCallback(async () => {
    if (!orderType) return;

    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('archived_orders')
        .select(ARCHIVED_ORDER_COLUMNS)
        .eq('order_type', orderType)
        .order('id', { ascending: false });
      if (fetchError) throw fetchError;
      setRows((data ?? []) as ArchivedOrderRow[]);
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
        String(row.original_order_id ?? '').includes(term) ||
        (row.customer_name ?? '').toLowerCase().includes(term) ||
        (row.customer_email ?? '').toLowerCase().includes(term) ||
        (row.customer_phone ?? '').toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyArchivedOrderForm());
    setDialogOpen(true);
  };

  const openEdit = (row: ArchivedOrderRow) => {
    setEditingId(row.id);
    setForm(toForm(row));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!orderType) return;

    const parsedTotal = Number(form.total);
    if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
      toast.error('Total must be a valid non-negative number.');
      return;
    }

    let parsedItems: ArchivedOrderItem[];
    try {
      parsedItems = parseArchivedItems(form.itemsJson);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid items JSON.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        order_type: orderType,
        original_order_id: form.original_order_id,
        customer_name: form.customer_name.trim() || null,
        customer_email: form.customer_email.trim() || null,
        customer_phone: form.customer_phone.trim() || null,
        store_id: form.store_id,
        pickup_time: form.pickup_time.trim() || null,
        total: parsedTotal.toFixed(2),
        status: form.status,
        payment_status: form.payment_status,
        notes: form.notes.trim() || null,
        items: parsedItems,
        archived_reason: form.archived_reason.trim() || null,
        archived_at: form.archived_at.trim() || new Date().toISOString(),
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('archived_orders')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (updateError) throw updateError;
        toast.success('Archived order updated.');
      } else {
        const { error: insertError } = await supabase.from('archived_orders').insert({
          ...payload,
          created_at: form.created_at.trim() || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (insertError) throw insertError;
        toast.success('Archived order created.');
      }

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
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{tableTitle}</CardTitle>
              <CardDescription>Read and update archived order records.</CardDescription>
            </div>
            <Button onClick={openCreate} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add archived order
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Input
              placeholder="Search by archive ID, original order ID, customer, email or phone..."
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
                      <th className="px-4 py-3 text-left text-sm font-semibold">Archive ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Original ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Archived At</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3 font-mono text-sm">{row.id}</td>
                        <td className="px-4 py-3 font-mono text-sm">{row.original_order_id ?? '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium">{row.customer_name ?? '-'}</p>
                          <p className="text-muted-foreground">{row.customer_email ?? '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.total ? `$${Number(row.total).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{row.status ?? 'none'}</Badge>
                            <Badge variant={row.payment_status === 'paid' ? 'default' : 'secondary'}>
                              {row.payment_status ?? 'none'}
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
                              onClick={() => openEdit(row)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? 'Edit archived order' : 'Add archived order'}</DialogTitle>
            <DialogDescription>
              Manage archived order data (deletion is intentionally disabled).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="arch-original-order-id">Original order ID</Label>
              <Input
                id="arch-original-order-id"
                type="number"
                value={form.original_order_id ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    original_order_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arch-store-id">Store ID</Label>
              <Input
                id="arch-store-id"
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
              <Label htmlFor="arch-customer-name">Customer name</Label>
              <Input
                id="arch-customer-name"
                value={form.customer_name}
                onChange={(e) => setForm((prev) => ({ ...prev, customer_name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arch-customer-email">Customer email</Label>
              <Input
                id="arch-customer-email"
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm((prev) => ({ ...prev, customer_email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arch-customer-phone">Customer phone</Label>
              <Input
                id="arch-customer-phone"
                value={form.customer_phone}
                onChange={(e) => setForm((prev) => ({ ...prev, customer_phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arch-pickup-time">Pickup time</Label>
              <Input
                id="arch-pickup-time"
                value={form.pickup_time}
                onChange={(e) => setForm((prev) => ({ ...prev, pickup_time: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arch-total">Total</Label>
              <Input
                id="arch-total"
                type="number"
                min="0"
                step="0.01"
                value={form.total}
                onChange={(e) => setForm((prev) => ({ ...prev, total: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arch-archived-at">Archived at (ISO)</Label>
              <Input
                id="arch-archived-at"
                value={form.archived_at}
                onChange={(e) => setForm((prev) => ({ ...prev, archived_at: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arch-status">Order status</Label>
              <Select
                value={form.status ?? 'null'}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value === 'null' ? null : (value as OrderStatus),
                  }))
                }
              >
                <SelectTrigger id="arch-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">None</SelectItem>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arch-payment-status">Payment status</Label>
              <Select
                value={form.payment_status ?? 'null'}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    payment_status: value === 'null' ? null : (value as PaymentStatus),
                  }))
                }
              >
                <SelectTrigger id="arch-payment-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">None</SelectItem>
                  {PAYMENT_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="arch-archived-reason">Archived reason</Label>
              <Input
                id="arch-archived-reason"
                value={form.archived_reason}
                onChange={(e) => setForm((prev) => ({ ...prev, archived_reason: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="arch-notes">Notes</Label>
              <Textarea
                id="arch-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="arch-items">Items JSON</Label>
              <Textarea
                id="arch-items"
                rows={10}
                value={form.itemsJson}
                onChange={(e) => setForm((prev) => ({ ...prev, itemsJson: e.target.value }))}
                placeholder='[{"menuItemId":1,"qty":2,"unitPrice":12.5,"itemName":"Pho"}]'
                className="font-mono text-xs"
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
    </DashboardLayout>
  );
}
