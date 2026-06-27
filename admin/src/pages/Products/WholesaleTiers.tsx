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
import { RefreshTableButton } from '@/components/ui/refresh-table-button';
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
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type WholesaleTierRow = {
  id: number;
  label: string;
  min_value: number;
  discount_value: number;
  color: string;
  popular: boolean;
  sort_order: number;
};

type WholesaleTierInput = {
  label: string;
  min_value: string;
  discount_value: string;
  color: string;
  popular: boolean;
  sort_order: number;
};

const emptyTierInput = (): WholesaleTierInput => ({
  label: '',
  min_value: '0',
  discount_value: '0',
  color: '',
  popular: false,
  sort_order: 0,
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const pct = Number(value);
  if (pct === 0) return '0%';
  const formatted =
    pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1).replace(/\.0$/, '');
  return `${formatted}%`;
}

export function WholesaleTiers() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [tiers, setTiers] = useState<WholesaleTierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<WholesaleTierInput>(emptyTierInput());

  const [deleteTarget, setDeleteTarget] = useState<WholesaleTierRow | null>(
    null,
  );
  const [search, setSearch] = useState('');

  const loadTiers = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('wholesale_tiers')
        .select(
          'id, label, min_value, discount_value, color, popular, sort_order',
        )
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setTiers((data ?? []) as WholesaleTierRow[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load wholesale tiers.';
      setError(message);
      setTiers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadTiers();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadTiers]);

  const filteredTiers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tiers;
    return tiers.filter((tier) => {
      return (
        tier.label.toLowerCase().includes(term) ||
        String(tier.min_value).includes(term) ||
        String(tier.discount_value).includes(term) ||
        tier.color.toLowerCase().includes(term)
      );
    });
  }, [tiers, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyTierInput(),
      sort_order: tiers.length,
    });
    setDialogOpen(true);
  };

  const openEdit = (tier: WholesaleTierRow) => {
    setEditingId(tier.id);
    setForm({
      label: tier.label,
      min_value: String(tier.min_value),
      discount_value: String(tier.discount_value),
      color: tier.color,
      popular: tier.popular,
      sort_order: tier.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error('Label is required.');
      return;
    }

    const minValue = Number(form.min_value);
    if (!Number.isFinite(minValue) || minValue < 0) {
      toast.error('Minimum order value must be a non-negative number.');
      return;
    }

    const discountValue = Number(form.discount_value);
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      toast.error('Discount value must be a non-negative number.');
      return;
    }

    if (!form.color.trim()) {
      toast.error('Color gradient class is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        min_value: minValue,
        discount_value: discountValue,
        color: form.color.trim(),
        popular: form.popular,
        sort_order: Number(form.sort_order) || 0,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('wholesale_tiers')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Wholesale tier updated.');
      } else {
        const { error: insertError } = await supabase
          .from('wholesale_tiers')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Wholesale tier created.');
      }

      setDialogOpen(false);
      await loadTiers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save wholesale tier.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('wholesale_tiers')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Wholesale tier deleted.');
      setDeleteTarget(null);
      await loadTiers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete wholesale tier.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Wholesale Tiers">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Wholesale Tiers">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage wholesale pricing tiers.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Wholesale Tiers">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Wholesale tiers</CardTitle>
              <CardDescription>
                Manage bulk-pricing tiers shown on the public wholesale shop
                page. Discounts apply based on order value.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadTiers()}
                disabled={loading}
              />
              <Button onClick={openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add tier
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Input
              placeholder="Search label, min value, discount, color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No wholesale tiers found. Add one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Label
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Min value
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Discount
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Color
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Popular
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Sort
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTiers.map((tier) => (
                      <tr
                        key={tier.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">{tier.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {tier.label}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatCurrency(tier.min_value)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatPercent(tier.discount_value)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {tier.color}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={tier.popular ? 'default' : 'secondary'}>
                            {tier.popular ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {tier.sort_order}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(tier)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(tier)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit wholesale tier' : 'Add wholesale tier'}
            </DialogTitle>
            <DialogDescription>
              Color should be Tailwind gradient classes using{' '}
              <code>from-… to-…</code> only (e.g.{' '}
              <code>from-amber-500/45 to-yellow-500/30</code>). Do not use{' '}
              <code>via-</code> stops — they will not render. Discount value is
              a percentage applied when the order subtotal meets the minimum
              value.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tier-label">Label</Label>
              <Input
                id="tier-label"
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="Gold"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tier-min-value">Minimum order value (AUD)</Label>
              <Input
                id="tier-min-value"
                type="number"
                min="0"
                step="0.01"
                value={form.min_value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, min_value: e.target.value }))
                }
                placeholder="2500.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tier-discount-value">Discount (%)</Label>
              <Input
                id="tier-discount-value"
                type="number"
                min="0"
                step="0.01"
                value={form.discount_value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_value: e.target.value }))
                }
                placeholder="15"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tier-color">Color gradient class</Label>
              <Input
                id="tier-color"
                value={form.color}
                onChange={(e) =>
                  setForm((f) => ({ ...f, color: e.target.value }))
                }
                placeholder="from-amber-500/45 to-yellow-500/30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tier-sort">Sort order</Label>
              <Input
                id="tier-sort"
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sort_order: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tier-popular"
                type="checkbox"
                checked={form.popular}
                onChange={(e) =>
                  setForm((f) => ({ ...f, popular: e.target.checked }))
                }
                className="h-4 w-4"
              />
              <Label htmlFor="tier-popular">Mark as popular</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete wholesale tier?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.label}</strong>.
              This cannot be undone.
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
