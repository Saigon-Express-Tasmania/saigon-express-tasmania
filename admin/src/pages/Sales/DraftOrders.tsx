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
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSalesOrderType } from './useSalesOrderType';

type DraftOrderItem = {
  menuItemId: number;
  qty: number;
  unitPrice: number;
  itemName: string;
};

type DraftOrderRow = {
  id: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  store_id: number | null;
  pickup_time: string | null;
  total: string | null;
  notes: string | null;
  items: unknown;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type DraftOrderForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  store_id: number | null;
  pickup_time: string;
  total: string;
  notes: string;
  itemsJson: string;
  expires_at: string;
};

const DRAFT_ORDER_COLUMNS =
  'id, customer_name, customer_email, customer_phone, store_id, pickup_time, total, notes, items, expires_at, created_at, updated_at';

function emptyDraftOrderForm(): DraftOrderForm {
  return {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    store_id: null,
    pickup_time: '',
    total: '0.00',
    notes: '',
    itemsJson: '[]',
    expires_at: '',
  };
}

function toDraftOrderForm(row: DraftOrderRow): DraftOrderForm {
  return {
    customer_name: row.customer_name ?? '',
    customer_email: row.customer_email ?? '',
    customer_phone: row.customer_phone ?? '',
    store_id: row.store_id,
    pickup_time: row.pickup_time ?? '',
    total: row.total ? String(row.total) : '0.00',
    notes: row.notes ?? '',
    itemsJson: JSON.stringify(row.items ?? [], null, 2),
    expires_at: row.expires_at ?? '',
  };
}

function parseDraftItems(itemsJson: string): DraftOrderItem[] {
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
  const [form, setForm] = useState<DraftOrderForm>(emptyDraftOrderForm());
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
    setForm(emptyDraftOrderForm());
    setDialogOpen(true);
  };

  const openEdit = (row: DraftOrderRow) => {
    setEditingId(row.id);
    setForm(toDraftOrderForm(row));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!orderType) return;

    if (form.total.trim()) {
      const total = Number(form.total);
      if (!Number.isFinite(total) || total < 0) {
        toast.error('Total must be a valid non-negative number.');
        return;
      }
    }

    let parsedItems: DraftOrderItem[];
    try {
      parsedItems = parseDraftItems(form.itemsJson);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid items JSON.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        order_type: orderType,
        customer_name: form.customer_name.trim() || null,
        customer_email: form.customer_email.trim() || null,
        customer_phone: form.customer_phone.trim() || null,
        store_id: form.store_id,
        pickup_time: form.pickup_time.trim() || null,
        total: form.total.trim() ? Number(form.total).toFixed(2) : null,
        notes: form.notes.trim() || null,
        items: parsedItems,
        expires_at: form.expires_at.trim() || null,
      };

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
        const { error: insertError } = await supabase.from('draft_orders').insert({
          ...payload,
          created_at: nowIso,
          updated_at: nowIso,
        });
        if (insertError) throw insertError;
        toast.success('Draft order created.');
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
                      <th className="px-4 py-3 text-left text-sm font-semibold">Pickup</th>
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
                          {row.pickup_time ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.total ? `$${Number(row.total).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {row.expires_at ? new Date(row.expires_at).toLocaleString() : '-'}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="draft-pickup-time">Pickup time</Label>
              <Input
                id="draft-pickup-time"
                value={form.pickup_time}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pickup_time: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-total">Total</Label>
              <Input
                id="draft-total"
                type="number"
                min="0"
                step="0.01"
                value={form.total}
                onChange={(e) => setForm((prev) => ({ ...prev, total: e.target.value }))}
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
              <Label htmlFor="draft-notes">Notes</Label>
              <Textarea
                id="draft-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="draft-items">Items JSON</Label>
              <Textarea
                id="draft-items"
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
