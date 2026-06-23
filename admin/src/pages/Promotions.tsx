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
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type PromotionRow = {
  id: number;
  title: string;
  description: string | null;
  badge: string | null;
  discount_label: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type PromotionInput = Omit<PromotionRow, 'created_at' | 'updated_at'>;

const emptyPromotionInput = (): PromotionInput => ({
  id: 0,
  title: '',
  description: '',
  badge: '',
  discount_label: '',
  image_url: '',
  cta_label: '',
  cta_href: '',
  starts_at: null,
  expires_at: null,
  is_active: true,
  sort_order: 0,
});

async function nextPromotionId(): Promise<number> {
  const { data, error } = await supabase
    .from('promotions')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxId = data?.[0]?.id ?? 0;
  return Number(maxId) + 1;
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function Promotions() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PromotionInput>(emptyPromotionInput());

  const [deleteTarget, setDeleteTarget] = useState<PromotionRow | null>(null);
  const [search, setSearch] = useState('');

  const loadPromotions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('promotions')
        .select(
          'id, title, description, badge, discount_label, image_url, cta_label, cta_href, starts_at, expires_at, is_active, sort_order, created_at, updated_at',
        )
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setPromotions((data ?? []) as PromotionRow[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load promotions.';
      setError(message);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadPromotions();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadPromotions]);

  const filteredPromotions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return promotions;
    return promotions.filter((p) => {
      return (
        p.title.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term) ||
        (p.badge ?? '').toLowerCase().includes(term) ||
        (p.discount_label ?? '').toLowerCase().includes(term)
      );
    });
  }, [promotions, search]);

  const openCreate = async () => {
    try {
      const id = await nextPromotionId();
      setEditingId(null);
      setForm({
        ...emptyPromotionInput(),
        id,
        sort_order: promotions.length + 1,
      });
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not prepare new promotion.',
      );
    }
  };

  const openEdit = (promo: PromotionRow) => {
    setEditingId(promo.id);
    setForm({
      id: promo.id,
      title: promo.title,
      description: promo.description ?? '',
      badge: promo.badge ?? '',
      discount_label: promo.discount_label ?? '',
      image_url: promo.image_url ?? '',
      cta_label: promo.cta_label ?? '',
      cta_href: promo.cta_href ?? '',
      starts_at: promo.starts_at,
      expires_at: promo.expires_at,
      is_active: promo.is_active,
      sort_order: promo.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const payload: PromotionRow = {
        id: form.id,
        title: form.title.trim(),
        description: form.description?.trim() || null,
        badge: form.badge?.trim() || null,
        discount_label: form.discount_label?.trim() || null,
        image_url: form.image_url?.trim() || null,
        cta_label: form.cta_label?.trim() || null,
        cta_href: form.cta_href?.trim() || null,
        starts_at: form.starts_at,
        expires_at: form.expires_at,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
        created_at: nowIso,
        updated_at: nowIso,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('promotions')
          .update({
            title: payload.title,
            description: payload.description,
            badge: payload.badge,
            discount_label: payload.discount_label,
            image_url: payload.image_url,
            cta_label: payload.cta_label,
            cta_href: payload.cta_href,
            starts_at: payload.starts_at,
            expires_at: payload.expires_at,
            is_active: payload.is_active,
            sort_order: payload.sort_order,
            updated_at: nowIso,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Promotion updated.');
      } else {
        const { error: insertError } = await supabase.from('promotions').insert({
          id: payload.id,
          title: payload.title,
          description: payload.description,
          badge: payload.badge,
          discount_label: payload.discount_label,
          image_url: payload.image_url,
          cta_label: payload.cta_label,
          cta_href: payload.cta_href,
          starts_at: payload.starts_at,
          expires_at: payload.expires_at,
          is_active: payload.is_active,
          sort_order: payload.sort_order,
          created_at: nowIso,
          updated_at: nowIso,
        });

        if (insertError) throw insertError;
        toast.success('Promotion created.');
      }

      setDialogOpen(false);
      await loadPromotions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save promotion.',
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
        .from('promotions')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Promotion deleted.');
      setDeleteTarget(null);
      await loadPromotions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete promotion.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Promotions">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Promotions">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage promotions.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Promotions">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Promotions</CardTitle>
              <CardDescription>
                Manage promo cards shown on the public website.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadPromotions()}
                disabled={loading}
              />
              <Button onClick={() => void openCreate()} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add promotion
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
              placeholder="Search promotions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPromotions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No promotions yet. Add one to get started.
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
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Badge
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Discount
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Active
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Starts
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Expires
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
                    {filteredPromotions.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">{p.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {p.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.badge ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.discount_label ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={p.is_active ? 'default' : 'secondary'}>
                            {p.is_active ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.starts_at ? new Date(p.starts_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.expires_at ? new Date(p.expires_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.sort_order}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(p)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit promotion' : 'Add promotion'}
            </DialogTitle>
            <DialogDescription>
              Active promotions can be shown on the public site.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="promo-id">ID</Label>
              <Input
                id="promo-id"
                type="number"
                value={form.id}
                disabled={editingId !== null}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-sort">Sort order</Label>
              <Input
                id="promo-sort"
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

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="promo-title">Title</Label>
              <Input
                id="promo-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="promo-badge">Badge</Label>
              <Input
                id="promo-badge"
                value={form.badge ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, badge: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-discount">Discount label</Label>
              <Input
                id="promo-discount"
                value={form.discount_label ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_label: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="promo-image">Image URL</Label>
              <Input
                id="promo-image"
                value={form.image_url ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image_url: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="promo-cta-label">CTA label</Label>
              <Input
                id="promo-cta-label"
                value={form.cta_label ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_label: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-cta-href">CTA href</Label>
              <Input
                id="promo-cta-href"
                value={form.cta_href ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_href: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="promo-starts">Starts at</Label>
              <Input
                id="promo-starts"
                type="datetime-local"
                value={toDatetimeLocalValue(form.starts_at)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    starts_at: fromDatetimeLocalValue(e.target.value),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promo-expires">Expires at</Label>
              <Input
                id="promo-expires"
                type="datetime-local"
                value={toDatetimeLocalValue(form.expires_at)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    expires_at: fromDatetimeLocalValue(e.target.value),
                  }))
                }
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="promo-active">Active</Label>
              <Input
                id="promo-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.checked }))
                }
                className="h-4 w-4"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="promo-description">Description</Label>
              <Textarea
                id="promo-description"
                rows={4}
                value={form.description ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
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
            <AlertDialogTitle>Delete promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.title}</strong>.
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

