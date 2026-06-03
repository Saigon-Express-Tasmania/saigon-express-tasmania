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
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

type TestOrderRow = {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  store_id: number | null;
  pickup_time: string;
  total: string;
  status: OrderStatus;
  stripe_checkout_session_id: string | null;
  stripe_mode: 'test' | 'live' | null;
  payment_status: PaymentStatus;
  notes: string | null;
  cancel_token: string | null;
  tracking_token: string | null;
  status_updated_at: string | null;
  receipt_confirmed_at: string | null;
  created_at: string;
};

type TestOrderItemRow = {
  id: number;
  order_id: number;
  menu_item_id: number;
  qty: number;
  unit_price: string;
  item_name: string;
};

type TestOrderForm = Omit<TestOrderRow, 'id' | 'created_at'> & {
  itemsJson: string;
};

type TestOrderItemForm = {
  menu_item_id: number;
  qty: number;
  unit_price: number;
  item_name: string;
};

const TEST_ORDER_COLUMNS =
  'id, customer_name, customer_email, customer_phone, store_id, pickup_time, total, status, stripe_checkout_session_id, stripe_mode, payment_status, notes, cancel_token, tracking_token, status_updated_at, receipt_confirmed_at, created_at';

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
];

const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ['unpaid', 'paid', 'refunded'];

function emptyTestOrderForm(): TestOrderForm {
  return {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    store_id: null,
    pickup_time: '',
    total: '0.00',
    status: 'pending',
    stripe_checkout_session_id: null,
    stripe_mode: 'test',
    payment_status: 'unpaid',
    notes: null,
    cancel_token: null,
    tracking_token: null,
    status_updated_at: null,
    receipt_confirmed_at: null,
    itemsJson: '[]',
  };
}

function orderToForm(order: TestOrderRow, items: TestOrderItemRow[]): TestOrderForm {
  const itemPayload: TestOrderItemForm[] = items.map((item) => ({
    menu_item_id: item.menu_item_id,
    qty: item.qty,
    unit_price: Number(item.unit_price),
    item_name: item.item_name,
  }));

  return {
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    store_id: order.store_id,
    pickup_time: order.pickup_time,
    total: order.total,
    status: order.status,
    stripe_checkout_session_id: order.stripe_checkout_session_id,
    stripe_mode: order.stripe_mode,
    payment_status: order.payment_status,
    notes: order.notes,
    cancel_token: order.cancel_token,
    tracking_token: order.tracking_token,
    status_updated_at: order.status_updated_at,
    receipt_confirmed_at: order.receipt_confirmed_at,
    itemsJson: JSON.stringify(itemPayload, null, 2),
  };
}

function parseOrderItems(input: string): TestOrderItemForm[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error('Items JSON is invalid.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Items JSON must be an array.');
  }

  const items: TestOrderItemForm[] = parsed.map((raw) => {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Each item must be an object.');
    }
    const row = raw as Record<string, unknown>;
    const menu_item_id = Number(row.menu_item_id);
    const qty = Number(row.qty);
    const unit_price = Number(row.unit_price);
    const item_name = String(row.item_name ?? '').trim();

    if (!Number.isFinite(menu_item_id) || menu_item_id <= 0) {
      throw new Error('Each item must include a valid menu_item_id.');
    }
    if (!Number.isFinite(qty) || qty < 1) {
      throw new Error('Each item must include qty >= 1.');
    }
    if (!Number.isFinite(unit_price) || unit_price < 0) {
      throw new Error('Each item must include unit_price >= 0.');
    }
    if (!item_name) {
      throw new Error('Each item must include item_name.');
    }

    return { menu_item_id, qty, unit_price, item_name };
  });

  if (items.length === 0) {
    throw new Error('At least one item is required.');
  }

  return items;
}

export function TestOrders() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [orders, setOrders] = useState<TestOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [form, setForm] = useState<TestOrderForm>(emptyTestOrderForm());

  const [deleteTarget, setDeleteTarget] = useState<TestOrderRow | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('test_orders')
        .select(TEST_ORDER_COLUMNS)
        .order('id', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders((data ?? []) as TestOrderRow[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load test orders.';
      setError(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadOrders();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadOrders]);

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
    setForm(emptyTestOrderForm());
    setDialogOpen(true);
  };

  const openEdit = async (order: TestOrderRow) => {
    setSaving(true);
    try {
      const { data: items, error: itemError } = await supabase
        .from('test_order_items')
        .select('id, order_id, menu_item_id, qty, unit_price, item_name')
        .eq('order_id', order.id)
        .order('id', { ascending: true });

      if (itemError) throw itemError;
      setEditingOrderId(order.id);
      setForm(orderToForm(order, (items ?? []) as TestOrderItemRow[]));
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load test order details.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
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
    if (!form.pickup_time.trim()) {
      toast.error('Pickup time is required.');
      return;
    }
    const total = Number(form.total);
    if (!Number.isFinite(total) || total < 0) {
      toast.error('Total must be a valid non-negative number.');
      return;
    }

    let parsedItems: TestOrderItemForm[];
    try {
      parsedItems = parseOrderItems(form.itemsJson);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid items payload.');
      return;
    }

    setSaving(true);
    try {
      const orderPayload = {
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim(),
        customer_phone: form.customer_phone.trim(),
        store_id: form.store_id,
        pickup_time: form.pickup_time.trim(),
        total: total.toFixed(2),
        status: form.status,
        stripe_checkout_session_id: form.stripe_checkout_session_id?.trim() || null,
        stripe_mode: form.stripe_mode,
        payment_status: form.payment_status,
        notes: form.notes?.trim() || null,
        cancel_token: form.cancel_token?.trim() || null,
        tracking_token: form.tracking_token?.trim() || null,
        status_updated_at: form.status_updated_at || null,
        receipt_confirmed_at: form.receipt_confirmed_at || null,
      };

      let targetOrderId = editingOrderId;

      if (editingOrderId !== null) {
        const { error: updateError } = await supabase
          .from('test_orders')
          .update(orderPayload)
          .eq('id', editingOrderId);
        if (updateError) throw updateError;

        const { error: deleteItemsError } = await supabase
          .from('test_order_items')
          .delete()
          .eq('order_id', editingOrderId);
        if (deleteItemsError) throw deleteItemsError;
      } else {
        const { data: insertedOrder, error: insertError } = await supabase
          .from('test_orders')
          .insert(orderPayload)
          .select('id')
          .single();
        if (insertError || !insertedOrder) {
          throw insertError ?? new Error('Failed to create test order.');
        }
        targetOrderId = insertedOrder.id as number;
      }

      if (!targetOrderId) {
        throw new Error('Could not resolve test order id.');
      }

      const { error: insertItemsError } = await supabase.from('test_order_items').insert(
        parsedItems.map((item) => ({
          order_id: targetOrderId,
          menu_item_id: item.menu_item_id,
          qty: item.qty,
          unit_price: item.unit_price.toFixed(2),
          item_name: item.item_name,
        })),
      );
      if (insertItemsError) throw insertItemsError;

      toast.success(editingOrderId !== null ? 'Test order updated.' : 'Test order created.');
      setDialogOpen(false);
      await loadOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save test order.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('test_orders')
        .delete()
        .eq('id', deleteTarget.id);
      if (deleteError) throw deleteError;
      toast.success('Test order deleted.');
      setDeleteTarget(null);
      await loadOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete test order.');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Test orders">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Test orders">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>Only administrators can manage test orders.</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Test orders">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Test orders</CardTitle>
              <CardDescription>
                Stripe test-mode orders (separate from live orders).
              </CardDescription>
            </div>
            <Button onClick={openCreate} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add test order
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
              <p className="text-sm text-muted-foreground">No test orders found.</p>
            ) : (
              <div className="space-y-2">
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Pickup</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Payment</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="px-4 py-3 font-mono text-sm">{order.id}</td>
                          <td className="px-4 py-3 text-sm">
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-muted-foreground">{order.customer_email}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {order.pickup_time}
                          </td>
                          <td className="px-4 py-3 text-sm">${Number(order.total).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={order.status === 'cancelled' ? 'secondary' : 'default'}>
                              {order.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={order.payment_status === 'paid' ? 'default' : 'secondary'}
                            >
                              {order.payment_status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void openEdit(order)}
                                disabled={saving}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteTarget(order)}
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
                <Link
                  to="/sales/orders"
                  className="inline-block text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Live orders
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrderId !== null ? 'Edit test order' : 'Add test order'}
            </DialogTitle>
            <DialogDescription>Manage the test order payload and line items.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="test-order-name">Customer name</Label>
              <Input
                id="test-order-name"
                value={form.customer_name}
                onChange={(e) => setForm((prev) => ({ ...prev, customer_name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-email">Customer email</Label>
              <Input
                id="test-order-email"
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm((prev) => ({ ...prev, customer_email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-phone">Customer phone</Label>
              <Input
                id="test-order-phone"
                value={form.customer_phone}
                onChange={(e) => setForm((prev) => ({ ...prev, customer_phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-store-id">Store ID</Label>
              <Input
                id="test-order-store-id"
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
              <Label htmlFor="test-order-pickup">Pickup time</Label>
              <Input
                id="test-order-pickup"
                value={form.pickup_time}
                onChange={(e) => setForm((prev) => ({ ...prev, pickup_time: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-total">Total</Label>
              <Input
                id="test-order-total"
                type="number"
                min="0"
                step="0.01"
                value={form.total}
                onChange={(e) => setForm((prev) => ({ ...prev, total: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value as OrderStatus }))
                }
              >
                <SelectTrigger id="test-order-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-payment-status">Payment status</Label>
              <Select
                value={form.payment_status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    payment_status: value as PaymentStatus,
                  }))
                }
              >
                <SelectTrigger id="test-order-payment-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-stripe-mode">Stripe mode</Label>
              <Select
                value={form.stripe_mode ?? 'null'}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    stripe_mode: value === 'null' ? null : (value as 'test' | 'live'),
                  }))
                }
              >
                <SelectTrigger id="test-order-stripe-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">None</SelectItem>
                  <SelectItem value="test">test</SelectItem>
                  <SelectItem value="live">live</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="test-order-stripe-session">Stripe checkout session ID</Label>
              <Input
                id="test-order-stripe-session"
                value={form.stripe_checkout_session_id ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    stripe_checkout_session_id: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-cancel-token">Cancel token</Label>
              <Input
                id="test-order-cancel-token"
                value={form.cancel_token ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, cancel_token: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-tracking-token">Tracking token</Label>
              <Input
                id="test-order-tracking-token"
                value={form.tracking_token ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tracking_token: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-status-updated-at">Status updated at (ISO)</Label>
              <Input
                id="test-order-status-updated-at"
                value={form.status_updated_at ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status_updated_at: e.target.value || null }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="test-order-receipt-confirmed-at">Receipt confirmed at (ISO)</Label>
              <Input
                id="test-order-receipt-confirmed-at"
                value={form.receipt_confirmed_at ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    receipt_confirmed_at: e.target.value || null,
                  }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="test-order-notes">Notes</Label>
              <Textarea
                id="test-order-notes"
                rows={3}
                value={form.notes ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="test-order-items">Line items JSON</Label>
              <Textarea
                id="test-order-items"
                rows={10}
                value={form.itemsJson}
                onChange={(e) => setForm((prev) => ({ ...prev, itemsJson: e.target.value }))}
                placeholder='[{"menu_item_id":1,"qty":2,"unit_price":12.5,"item_name":"Pho"}]'
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
            <AlertDialogTitle>Delete test order?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes test order <strong>#{deleteTarget?.id}</strong> and all line
              items. This cannot be undone.
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
