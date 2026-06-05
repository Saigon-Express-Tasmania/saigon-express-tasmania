import { DashboardLayout } from '@/components/layout';
import { ImageUpload } from '@/components/ImageUpload';
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
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const CATEGORIES = ['Catering Boxes', 'Hot Dishes & Platters'] as const;
type Category = (typeof CATEGORIES)[number];

type TierPrice = {
  size: string;
  price: string;
  serves: string;
};

type CateringBoxRow = {
  id: number;
  category: Category;
  name: string;
  price: string | null;
  serves: string | null;
  includes: string[];
  note: string | null;
  prices: TierPrice[];
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
};

type CateringBoxInput = {
  id: number;
  category: Category;
  name: string;
  price: string;
  serves: string;
  includesText: string;
  note: string;
  pricesText: string;
  image_url: string;
  sort_order: number;
  is_available: boolean;
};

const emptyCateringBoxInput = (): CateringBoxInput => ({
  id: 0,
  category: 'Catering Boxes',
  name: '',
  price: '',
  serves: '',
  includesText: '',
  note: '',
  pricesText: '',
  image_url: '',
  sort_order: 0,
  is_available: true,
});

async function nextCateringBoxId(): Promise<number> {
  const { data, error } = await supabase
    .from('catering_boxes')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxId = data?.[0]?.id ?? 0;
  return Number(maxId) + 1;
}

function parseIncludes(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseTierPrices(text: string): TierPrice[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [size = '', price = '', serves = ''] = line
        .split('|')
        .map((part) => part.trim());
      return { size, price, serves };
    })
    .filter((item) => item.size && item.price && item.serves);
}

function formatTierPrices(prices: TierPrice[]): string {
  return prices.map((entry) => `${entry.size} | ${entry.price} | ${entry.serves}`).join('\n');
}

export function CateringBoxes() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia, isUploading } = useSupabaseStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [items, setItems] = useState<CateringBoxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CateringBoxInput>(emptyCateringBoxInput());
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CateringBoxRow | null>(null);
  const [search, setSearch] = useState('');

  const loadCateringBoxes = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('catering_boxes')
        .select(
          'id, category, name, price, serves, includes, note, prices, image_url, sort_order, is_available',
        )
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setItems((data ?? []) as CateringBoxRow[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load catering boxes.';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadCateringBoxes();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadCateringBoxes]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      return (
        item.category.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        (item.price ?? '').toLowerCase().includes(term) ||
        (item.serves ?? '').toLowerCase().includes(term) ||
        (item.note ?? '').toLowerCase().includes(term) ||
        (item.image_url ?? '').toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const openCreate = async () => {
    try {
      const id = await nextCateringBoxId();
      setEditingId(null);
      setForm({
        ...emptyCateringBoxInput(),
        id,
        sort_order: items.length,
      });
      setImagePreviewUrl(null);
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not prepare new catering item.',
      );
    }
  };

  const openEdit = (item: CateringBoxRow) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      category: item.category,
      name: item.name,
      price: item.price ?? '',
      serves: item.serves ?? '',
      includesText: (item.includes ?? []).join('\n'),
      note: item.note ?? '',
      pricesText: formatTierPrices(item.prices ?? []),
      image_url: item.image_url ?? '',
      sort_order: item.sort_order,
      is_available: item.is_available,
    });
    setImagePreviewUrl(item.image_url ?? null);
    setDialogOpen(true);
  };

  const handleImageUpload = async (fileInputs: File | File[]) => {
    const file = Array.isArray(fileInputs) ? fileInputs[0] : fileInputs;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const slugPart =
      form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'catering-box';
    const fileName = `${slugPart}-${Date.now()}.${ext}`;

    try {
      const { path, signedUrl } = await uploadMedia(file, {
        folder: 'catering-boxes',
        fileName,
        upsert: true,
      });
      setForm((prev) => ({ ...prev, image_url: path }));
      setImagePreviewUrl(signedUrl);
      toast.success('Catering image uploaded.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload catering image.';
      toast.error(message);
      throw err;
    }
  };

  const handleImageClear = () => {
    setForm((prev) => ({ ...prev, image_url: '' }));
    setImagePreviewUrl(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    const includesValues = parseIncludes(form.includesText);
    const tierPrices = parseTierPrices(form.pricesText);
    const isCateringBoxCategory = form.category === 'Catering Boxes';

    if (isCateringBoxCategory) {
      if (!form.price.trim()) {
        toast.error('Price is required for Catering Boxes.');
        return;
      }
      if (!form.serves.trim()) {
        toast.error('Serves is required for Catering Boxes.');
        return;
      }
      if (includesValues.length === 0) {
        toast.error('At least one include line is required for Catering Boxes.');
        return;
      }
    } else if (tierPrices.length === 0) {
      toast.error(
        'At least one tier price row is required. Use "Size | Price | Serves".',
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: form.id,
        category: form.category,
        name: form.name.trim(),
        price: isCateringBoxCategory ? form.price.trim() : null,
        serves: isCateringBoxCategory ? form.serves.trim() : null,
        includes: isCateringBoxCategory ? includesValues : [],
        note: form.note.trim() || null,
        prices: isCateringBoxCategory ? [] : tierPrices,
        image_url: form.image_url.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_available: form.is_available,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('catering_boxes')
          .update({
            category: payload.category,
            name: payload.name,
            price: payload.price,
            serves: payload.serves,
            includes: payload.includes,
            note: payload.note,
            prices: payload.prices,
            image_url: payload.image_url,
            sort_order: payload.sort_order,
            is_available: payload.is_available,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Catering item updated.');
      } else {
        const { error: insertError } = await supabase
          .from('catering_boxes')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Catering item created.');
      }

      setDialogOpen(false);
      await loadCateringBoxes();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save catering item.',
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
        .from('catering_boxes')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Catering item deleted.');
      setDeleteTarget(null);
      await loadCateringBoxes();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete catering item.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Catering Boxes">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Catering Boxes">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage catering boxes.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Catering Boxes">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Catering boxes</CardTitle>
              <CardDescription>
                Manage catering boxes and hot dishes shown on the public catering
                page.
              </CardDescription>
            </div>
            <Button onClick={() => void openCreate()} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add catering item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Input
              placeholder="Search category, name, price..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No catering items found. Add one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Available
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
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">{item.id}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.category}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.price ??
                            (item.prices?.[0]?.price
                              ? `${item.prices[0].price}+`
                              : '-')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.is_available ? 'default' : 'secondary'}>
                            {item.is_available ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.sort_order}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(item)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit catering item' : 'Add catering item'}
            </DialogTitle>
            <DialogDescription>
              For hot dishes, enter one tier per line as: Size | Price | Serves
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <ImageUpload
                label="Catering image"
                description="JPEG, PNG, WebP or GIF. Upload to set image URL."
                value={imagePreviewUrl ?? form.image_url ?? null}
                onFileSelect={handleImageUpload}
                onClear={form.image_url ? handleImageClear : undefined}
                isUploading={isUploading}
                disabled={saving}
                shape="square"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item-id">ID</Label>
              <Input
                id="item-id"
                type="number"
                value={form.id}
                disabled={editingId !== null}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-sort">Sort order</Label>
              <Input
                id="item-sort"
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
              <Label htmlFor="item-category">Category</Label>
              <select
                id="item-category"
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as Category }))
                }
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="item-name">Name</Label>
              <Input
                id="item-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-price">Price</Label>
              <Input
                id="item-price"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-serves">Serves</Label>
              <Input
                id="item-serves"
                value={form.serves}
                onChange={(e) => setForm((f) => ({ ...f, serves: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="item-note">Note (optional)</Label>
              <Input
                id="item-note"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="item-image-url">Image URL</Label>
              <Input
                id="item-image-url"
                value={form.image_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image_url: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="item-includes">Includes (one per line)</Label>
              <Textarea
                id="item-includes"
                rows={4}
                value={form.includesText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, includesText: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="item-tier-prices">
                Tier prices (Size | Price | Serves)
              </Label>
              <Textarea
                id="item-tier-prices"
                rows={4}
                value={form.pricesText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pricesText: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="item-available">Available</Label>
              <input
                id="item-available"
                type="checkbox"
                checked={form.is_available}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_available: e.target.checked }))
                }
                className="h-4 w-4"
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
                  Saving...
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
            <AlertDialogTitle>Delete catering item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.name}</strong>. This
              cannot be undone.
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
