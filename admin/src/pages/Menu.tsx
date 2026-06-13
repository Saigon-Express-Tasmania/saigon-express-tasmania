import { DashboardLayout } from '@/components/layout';
import { ImageUpload } from '@/components/ImageUpload';
import { MenuAdditionalImages } from '@/components/MenuAdditionalImages';
import { MenuIngredientsEditor } from '@/components/MenuIngredientsEditor';
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
import { previewFromImageUrls, type ImageUrlsMap } from '@/lib/image-urls';
import { resizeImageToSizes } from '@/lib/image-resize';
import {
  parseMenuImageUrls,
  previewFromParsedMenuImages,
  serializeMenuImageUrls,
  type MenuImageMoreEntry,
} from '@/lib/menu-image-urls';
import { resolveMenuSlug, slugFromName } from '@/lib/slug';
import { nextProductId } from '@/lib/products';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { ImageIcon, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  emptyMenuItemIngredient,
  isMenuItemIngredientEmpty,
  parseMenuItemIngredient,
  serializeMenuItemIngredient,
  type MenuItemIngredient,
} from '@/types/MenuItem';

const MENU_IMAGE_UPLOAD_RESIZES = [256, 512, 1024, 1920] as const;
const ADDITIONAL_IMAGE_SM = 256;
const ADDITIONAL_IMAGE_LG = 1920;

type MenuItemRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  wholesale_price: string | null;
  category: string;
  image_urls: Record<string, unknown>;
  related_items: number[];
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
  ingredients: unknown;
};

type MenuItemInput = Omit<MenuItemRow, 'ingredients' | 'image_urls'> & {
  image_sizes: ImageUrlsMap;
  additional_images: MenuImageMoreEntry[];
  ingredients: MenuItemIngredient;
};

const emptyMenuItemInput = (): MenuItemInput => ({
  id: 0,
  slug: '',
  name: '',
  description: '',
  price: '',
  wholesale_price: '',
  category: '',
  image_sizes: {},
  additional_images: [],
  related_items: [],
  is_available: true,
  is_popular: false,
  sort_order: 0,
  ingredients: emptyMenuItemIngredient(),
});

async function nextMenuId(): Promise<number> {
  return nextProductId('alacarte');
}

export function Menu() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia } = useSupabaseStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MenuItemInput>(emptyMenuItemInput());
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingAdditionalImages, setIsUploadingAdditionalImages] =
    useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MenuItemRow | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const loadItems = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select(
          'id, name, slug, description, price, wholesale_price, category, image_urls, is_available, is_popular, sort_order, ingredients',
        )
        .eq('product_type', 'alacarte')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setItems(
        (data ?? []).map((row) => {
          const item = row as MenuItemRow;
          return {
            ...item,
            slug: resolveMenuSlug(item.slug, item.name),
          };
        }),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load menu items.';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadItems();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    });
  }, [items, search, categoryFilter]);

  const openCreate = async () => {
    try {
      const id = await nextMenuId();
      setEditingId(null);
      setForm({
        ...emptyMenuItemInput(),
        id,
      });
      setImagePreviewUrl(null);
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not prepare new menu item.',
      );
    }
  };

  const openEdit = (item: MenuItemRow) => {
    const parsedImages = parseMenuImageUrls(item.image_urls);
    setEditingId(item.id);
    setForm({
      id: item.id,
      name: item.name,
      slug: resolveMenuSlug(item.slug, item.name),
      description: item.description ?? '',
      price: item.price,
      wholesale_price: item.wholesale_price ?? '',
      category: item.category,
      image_sizes: parsedImages.sizes,
      additional_images: parsedImages.more,
      related_items: item.related_items,
      is_available: item.is_available,
      is_popular: item.is_popular,
      sort_order: item.sort_order,
      ingredients: parseMenuItemIngredient(item.ingredients),
    });
    setImagePreviewUrl(
      previewFromParsedMenuImages(parsedImages, [256, 512, 1024, 1920]),
    );
    setDialogOpen(true);
  };

  const handleImageUpload = async (input: File | File[]) => {
    const files = Array.isArray(input) ? input : [input];
    const sizes = [...MENU_IMAGE_UPLOAD_RESIZES].sort((a, b) => a - b);

    if (files.length !== sizes.length) {
      toast.error('Unexpected number of resized image files.');
      return;
    }

    const slugPart = form.slug.trim() || `menu-${form.id}`;
    const timestamp = Date.now();

    setIsUploadingImages(true);
    try {
      const imageUrls: ImageUrlsMap = {};

      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${slugPart}-${timestamp}_${size}.${ext}`;

        const { publicUrl } = await uploadMedia(file, {
          folder: 'menu',
          fileName,
          upsert: true,
        });
        imageUrls[String(size)] = publicUrl;
      }

      setForm((prev) => ({ ...prev, image_sizes: imageUrls }));
      setImagePreviewUrl(previewFromImageUrls(imageUrls));
      toast.success('Menu images uploaded.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload menu images.';
      toast.error(message);
      throw err;
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleImageClear = () => {
    setForm((prev) => ({ ...prev, image_sizes: {} }));
    setImagePreviewUrl(null);
  };

  const handleAdditionalImageUpload = async (file: File) => {
    const slugPart = form.slug.trim() || `menu-${form.id}`;
    const timestamp = Date.now();
    const index = form.additional_images.length;

    setIsUploadingAdditionalImages(true);
    try {
      const [smFile, lgFile] = await resizeImageToSizes(file, [
        ADDITIONAL_IMAGE_SM,
        ADDITIONAL_IMAGE_LG,
      ]);
      const ext = smFile.name.split('.').pop()?.toLowerCase() || 'jpg';

      const { publicUrl: sm } = await uploadMedia(smFile, {
        folder: 'menu',
        fileName: `${slugPart}-more-${index}-${timestamp}-sm.${ext}`,
        upsert: true,
      });
      const { publicUrl: lg } = await uploadMedia(lgFile, {
        folder: 'menu',
        fileName: `${slugPart}-more-${index}-${timestamp}-lg.${ext}`,
        upsert: true,
      });

      setForm((prev) => ({
        ...prev,
        additional_images: [...prev.additional_images, { sm, lg }],
      }));
      toast.success('Additional image added.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to upload additional image.';
      toast.error(message);
      throw err;
    } finally {
      setIsUploadingAdditionalImages(false);
    }
  };

  const handleAdditionalImageRemove = (index: number) => {
    setForm((prev) => ({
      ...prev,
      additional_images: prev.additional_images.filter((_, i) => i !== index),
    }));
  };

  const imageUploadBusy = isUploadingImages || isUploadingAdditionalImages;

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!form.price || isNaN(Number(form.price))) {
      toast.error('Price must be a valid number.');
      return;
    }
    if (!form.category.trim()) {
      toast.error('Category is required.');
      return;
    }

    const ingredientsValue = isMenuItemIngredientEmpty(form.ingredients)
      ? {}
      : serializeMenuItemIngredient(form.ingredients);

    setSaving(true);
    try {
      const slug = slugFromName(form.name);
      if (!slug) {
        toast.error('Name must produce a valid slug.');
        return;
      }

      const payload = {
        product_type: 'alacarte' as const,
        id: form.id,
        name: form.name.trim(),
        slug,
        description: form.description?.trim() || '',
        price: String(form.price),
        wholesale_price: form.wholesale_price?.trim() || null,
        category: form.category.trim(),
        image_urls: serializeMenuImageUrls(
          form.image_sizes,
          form.additional_images,
        ),
        is_available: form.is_available,
        is_popular: form.is_popular,
        sort_order: Number(form.sort_order) || 0,
        ingredients: ingredientsValue,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: payload.name,
            slug: payload.slug,
            description: payload.description,
            price: payload.price,
            wholesale_price: payload.wholesale_price,
            category: payload.category,
            image_urls: payload.image_urls,
            is_available: payload.is_available,
            is_popular: payload.is_popular,
            sort_order: payload.sort_order,
            ingredients: payload.ingredients,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)
          .eq('product_type', 'alacarte');

        if (updateError) throw updateError;
        toast.success('Menu item updated.');
      } else {
        const { error: insertError } = await supabase.from('products').insert(payload);

        if (insertError) throw insertError;
        toast.success('Menu item created.');
      }

      setDialogOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save menu item.',
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
        .from('products')
        .delete()
        .eq('id', deleteTarget.id)
        .eq('product_type', 'alacarte');

      if (deleteError) throw deleteError;
      toast.success('Menu item deleted.');
      setDeleteTarget(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete menu item.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Menu">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Menu">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage the menu.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Menu">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Menu items</CardTitle>
              <CardDescription>
                Manage items shown on the public menu.
              </CardDescription>
            </div>
            <Button onClick={() => void openCreate()} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add item
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
                placeholder="Search by name, description or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="category-filter" className="whitespace-nowrap">
                  Category
                </Label>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value)}
                >
                  <SelectTrigger id="category-filter" className="w-40">
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
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No menu items found. Add one to get started.
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
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Wholesale
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Popular
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
                    {filteredItems.map((item) => {
                      const thumb = previewFromParsedMenuImages(
                        parseMenuImageUrls(item.image_urls),
                        [256, 512, 1024, 1920],
                      );
                      return (
                      <tr
                        key={item.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">
                          {item.id}
                        </td>
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
                            <span className="min-w-0">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.category}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          ${Number(item.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.wholesale_price
                            ? `$${Number(item.wholesale_price).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={item.is_popular ? 'default' : 'secondary'}
                          >
                            {item.is_popular ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={item.is_available ? 'default' : 'secondary'}
                          >
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
          if (!open && imageUploadBusy) return;
          setDialogOpen(open);
        }}
      >
        <DialogContent
          className="sm:max-w-3xl max-w-3xl max-h-[90vh] overflow-y-auto"
          showCloseButton={!imageUploadBusy}
          onInteractOutside={(event) => {
            if (imageUploadBusy) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (imageUploadBusy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit menu item' : 'Add menu item'}
            </DialogTitle>
            <DialogDescription>
              Items marked as available appear on the public menu.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="menu-id">ID</Label>
              <Input
                id="menu-id"
                type="number"
                value={form.id}
                disabled={editingId !== null}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-sort">Sort order</Label>
              <Input
                id="menu-sort"
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
              <Label htmlFor="menu-name">Name</Label>
              <Input
                id="menu-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: slugFromName(name),
                  }));
                }}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="menu-slug">Slug</Label>
              <Input
                id="menu-slug"
                readOnly
                value={form.slug}
                className="cursor-default bg-muted text-foreground"
                aria-readonly="true"
                tabIndex={-1}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-category">Category</Label>
              <Input
                id="menu-category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <ImageUpload
                label="Menu item image"
                description="JPEG, PNG, WebP or GIF. Uploads 256, 512, 1024 and 1920px variants."
                value={
                  imagePreviewUrl ??
                  previewFromImageUrls(form.image_sizes) ??
                  null
                }
                onFileSelect={handleImageUpload}
                onClear={
                  Object.keys(form.image_sizes).length > 0
                    ? handleImageClear
                    : undefined
                }
                uploadResizes={[...MENU_IMAGE_UPLOAD_RESIZES]}
                isUploading={isUploadingImages}
                disabled={saving || imageUploadBusy}
                shape="square"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <MenuAdditionalImages
                images={form.additional_images}
                onAdd={handleAdditionalImageUpload}
                onRemove={handleAdditionalImageRemove}
                isUploading={isUploadingAdditionalImages}
                disabled={saving || imageUploadBusy}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-price">Price (AUD)</Label>
              <Input
                id="menu-price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-wholesale">Wholesale price (AUD)</Label>
              <Input
                id="menu-wholesale"
                type="number"
                step="0.01"
                value={form.wholesale_price ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, wholesale_price: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-available">Available</Label>
              <Select
                value={form.is_available ? 'yes' : 'no'}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, is_available: value === 'yes' }))
                }
              >
                <SelectTrigger id="menu-available">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-popular">Popular</Label>
              <Select
                value={form.is_popular ? 'yes' : 'no'}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, is_popular: value === 'yes' }))
                }
              >
                <SelectTrigger id="menu-popular">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="menu-description">Description</Label>
              <Textarea
                id="menu-description"
                rows={3}
                value={form.description ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <MenuIngredientsEditor
                value={form.ingredients}
                onChange={(ingredients) =>
                  setForm((f) => ({ ...f, ingredients }))
                }
                disabled={saving || imageUploadBusy}
                menuItemId={form.id}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving || imageUploadBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || imageUploadBusy}
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
            <AlertDialogTitle>Delete menu item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{' '}
              <strong>{deleteTarget?.name}</strong> from the menu. This cannot
              be undone.
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

