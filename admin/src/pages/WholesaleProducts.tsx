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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { ImageIcon, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const WHOLESALE_IMAGE_UPLOAD_RESIZES = [256, 512, 1024, 1448] as const;

type WholesaleImageUrls = Record<string, string>;

type WholesaleProductRow = {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  unit: string;
  unit_price: string;
  stock_qty: number;
  is_available: boolean;
  min_order_qty: number;
  image_urls: WholesaleImageUrls;
  created_at: string;
  updated_at: string;
};

function normalizeImageUrls(value: unknown): WholesaleImageUrls {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.entries(value as Record<string, unknown>).reduce<WholesaleImageUrls>(
    (acc, [key, url]) => {
      const trimmed = String(url ?? '').trim();
      if (trimmed) acc[key] = trimmed;
      return acc;
    },
    {},
  );
}

function previewFromImageUrls(
  urls: WholesaleImageUrls,
  preferredSizes: number[] = [1024, 1448, 512, 256],
): string | null {
  for (const size of preferredSizes) {
    const url = urls[String(size)]?.trim();
    if (url) return url;
  }
  const fallback = Object.values(urls).find((url) => url?.trim());
  return fallback?.trim() ?? null;
}

type WholesaleProductInput = Omit<
  WholesaleProductRow,
  'created_at' | 'updated_at'
>;

const SELECT_COLUMNS =
  'id, name, sku, category, description, unit, unit_price, stock_qty, is_available, min_order_qty, image_urls, created_at, updated_at';

const emptyWholesaleProductInput = (): WholesaleProductInput => ({
  id: 0,
  name: '',
  sku: '',
  category: '',
  description: '',
  unit: '',
  unit_price: '',
  stock_qty: 0,
  is_available: true,
  min_order_qty: 1,
  image_urls: {},
});

async function nextWholesaleProductId(): Promise<number> {
  const { data, error } = await supabase
    .from('wholesale_products')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxId = data?.[0]?.id ?? 0;
  return Number(maxId) + 1;
}

export function WholesaleProducts() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia } = useSupabaseStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [products, setProducts] = useState<WholesaleProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<WholesaleProductInput>(
    emptyWholesaleProductInput(),
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<WholesaleProductRow | null>(
    null,
  );
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const loadProducts = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('wholesale_products')
        .select(SELECT_COLUMNS)
        .order('category', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setProducts((data ?? []) as WholesaleProductRow[]);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load wholesale products.';
      setError(message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadProducts();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadProducts]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.sku ?? '').toLowerCase().includes(term)
      );
    });
  }, [products, search, categoryFilter]);

  const openCreate = async () => {
    try {
      const id = await nextWholesaleProductId();
      setEditingId(null);
      setForm({
        ...emptyWholesaleProductInput(),
        id,
      });
      setImagePreviewUrl(null);
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not prepare new wholesale product.',
      );
    }
  };

  const openEdit = (product: WholesaleProductRow) => {
    setEditingId(product.id);
    setForm({
      id: product.id,
      name: product.name,
      sku: product.sku ?? '',
      category: product.category,
      description: product.description ?? '',
      unit: product.unit,
      unit_price: product.unit_price,
      stock_qty: product.stock_qty,
      is_available: product.is_available,
      min_order_qty: product.min_order_qty,
      image_urls: normalizeImageUrls(product.image_urls),
    });
    setImagePreviewUrl(previewFromImageUrls(normalizeImageUrls(product.image_urls)));
    setDialogOpen(true);
  };

  const handleImageUpload = async (input: File | File[]) => {
    const files = Array.isArray(input) ? input : [input];
    const sizes = [...WHOLESALE_IMAGE_UPLOAD_RESIZES].sort((a, b) => a - b);

    if (files.length !== sizes.length) {
      toast.error('Unexpected number of resized image files.');
      return;
    }

    const slugPart =
      form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
      `wholesale-${form.id}`;
    const timestamp = Date.now();

    setIsUploadingImages(true);
    try {
      const imageUrls: WholesaleImageUrls = {};

      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${slugPart}-${timestamp}_${size}.${ext}`;

        const { publicUrl } = await uploadMedia(file, {
          folder: 'wholesale-products',
          fileName,
          upsert: true,
        });
        imageUrls[String(size)] = publicUrl;
      }

      setForm((prev) => ({ ...prev, image_urls: imageUrls }));
      setImagePreviewUrl(previewFromImageUrls(imageUrls));
      toast.success('Product images uploaded.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to upload product images.';
      toast.error(message);
      throw err;
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleImageClear = () => {
    setForm((prev) => ({ ...prev, image_urls: {} }));
    setImagePreviewUrl(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!form.category.trim()) {
      toast.error('Category is required.');
      return;
    }
    if (!form.unit.trim()) {
      toast.error('Unit is required.');
      return;
    }
    if (!form.unit_price || isNaN(Number(form.unit_price))) {
      toast.error('Unit price must be a valid number.');
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        id: form.id,
        name: form.name.trim(),
        sku: form.sku?.trim() || null,
        category: form.category.trim(),
        description: form.description?.trim() || null,
        unit: form.unit.trim(),
        unit_price: String(form.unit_price),
        stock_qty: Number(form.stock_qty) || 0,
        is_available: form.is_available,
        min_order_qty: Number(form.min_order_qty) || 1,
        image_urls: form.image_urls,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('wholesale_products')
          .update({
            ...payload,
            updated_at: nowIso,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Wholesale product updated.');
      } else {
        const { error: insertError } = await supabase
          .from('wholesale_products')
          .insert({
            ...payload,
            created_at: nowIso,
            updated_at: nowIso,
          });

        if (insertError) throw insertError;
        toast.success('Wholesale product created.');
      }

      setDialogOpen(false);
      await loadProducts();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to save wholesale product.',
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
        .from('wholesale_products')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Wholesale product deleted.');
      setDeleteTarget(null);
      await loadProducts();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to delete wholesale product.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Wholesale Products">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Wholesale Products">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage wholesale products.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Wholesale Products">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Wholesale products</CardTitle>
              <CardDescription>
                Manage products shown on the public wholesale shop catalogue.
              </CardDescription>
            </div>
            <Button onClick={() => void openCreate()} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add product
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Search by name, SKU, description or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="wp-category-filter" className="whitespace-nowrap">
                  Category
                </Label>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value)}
                >
                  <SelectTrigger id="wp-category-filter" className="w-44">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No wholesale products found. Add one to get started.
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
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Stock
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Min order
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Available
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const thumb = previewFromImageUrls(
                        normalizeImageUrls(p.image_urls),
                        [256, 512, 1024, 1448],
                      );
                      return (
                      <tr
                        key={p.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">{p.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex items-center gap-2.5">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                className="size-8 shrink-0 rounded-md border object-cover bg-muted"
                              />
                            ) : (
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                                <ImageIcon className="size-4" />
                              </div>
                            )}
                            <span className="min-w-0">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.category}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.unit}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          ${Number(p.unit_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.stock_qty}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.min_order_qty}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={p.is_available ? 'default' : 'secondary'}
                          >
                            {p.is_available ? 'Yes' : 'No'}
                          </Badge>
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
                    );
                    })}
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
          if (!open && isUploadingImages) return;
          setDialogOpen(open);
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          showCloseButton={!isUploadingImages}
          onInteractOutside={(event) => {
            if (isUploadingImages) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (isUploadingImages) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingId !== null
                ? 'Edit wholesale product'
                : 'Add wholesale product'}
            </DialogTitle>
            <DialogDescription>
              Available products appear on the public wholesale shop.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="wp-id">ID</Label>
              <Input
                id="wp-id"
                type="number"
                value={form.id}
                disabled={editingId !== null}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wp-available">Available</Label>
              <Select
                value={form.is_available ? 'yes' : 'no'}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, is_available: value === 'yes' }))
                }
              >
                <SelectTrigger id="wp-available">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="wp-name">Name</Label>
              <Input
                id="wp-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wp-category">Category</Label>
              <Input
                id="wp-category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wp-sku">SKU</Label>
              <Input
                id="wp-sku"
                value={form.sku ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sku: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wp-unit">Unit</Label>
              <Input
                id="wp-unit"
                placeholder="e.g. bag 20 pcs"
                value={form.unit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wp-price">Unit price (AUD)</Label>
              <Input
                id="wp-price"
                type="number"
                step="0.01"
                value={form.unit_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit_price: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wp-stock">Stock quantity</Label>
              <Input
                id="wp-stock"
                type="number"
                value={form.stock_qty}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    stock_qty: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wp-min-order">Min order quantity</Label>
              <Input
                id="wp-min-order"
                type="number"
                value={form.min_order_qty}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    min_order_qty: Number(e.target.value) || 1,
                  }))
                }
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <ImageUpload
                label="Product image"
                description="JPEG, PNG, WebP or GIF. Uploads 256, 512, 1024 and 1448px variants."
                value={imagePreviewUrl ?? previewFromImageUrls(form.image_urls) ?? null}
                onFileSelect={handleImageUpload}
                onClear={
                  Object.keys(form.image_urls).length > 0
                    ? handleImageClear
                    : undefined
                }
                uploadResizes={[...WHOLESALE_IMAGE_UPLOAD_RESIZES]}
                isUploading={isUploadingImages}
                disabled={saving || isUploadingImages}
                shape="square"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="wp-description">Description</Label>
              <Textarea
                id="wp-description"
                rows={3}
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
              disabled={saving || isUploadingImages}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || isUploadingImages}
            >
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
            <AlertDialogTitle>Delete wholesale product?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.name}</strong>.
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
