import { DashboardLayout } from '@/components/layout';
import { ImageUpload } from '@/components/ImageUpload';
import { MenuAdditionalImages } from '@/components/MenuAdditionalImages';
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
import { previewFromImageUrls, type ImageUrlsMap } from '@/lib/image-urls';
import { resizeImageToSizes } from '@/lib/image-resize';
import {
  parseMenuImageUrls,
  previewFromParsedMenuImages,
  serializeMenuImageUrls,
  type MenuImageMoreEntry,
} from '@/lib/menu-image-urls';
import { slugFromName } from '@/lib/slug';
import supabase from '@/lib/supabase/client';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const CATERING_IMAGE_UPLOAD_RESIZES = [256, 512, 1024, 1920] as const;
const ADDITIONAL_IMAGE_SM = 256;
const ADDITIONAL_IMAGE_LG = 1920;

type SortColumn = 'id' | 'category' | 'name';
type SortDirection = 'asc' | 'desc';

type CateringTierPrice = {
  size: string;
  price: string;
  serves: string;
};

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const isActive = sortColumn === column;
  const Icon = isActive
    ? sortDirection === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <th className="px-4 py-3 text-left text-sm font-semibold">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground/80"
        onClick={() => onSort(column)}
      >
        {label}
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </th>
  );
}

type CateringPackRow = {
  id: number;
  name: string;
  serves: string;
  price: string;
  description: string;
  includes: string[];
  tag: string;
  tag_bg: string;
  image_url: string | null;
  image_urls: Record<string, unknown>;
  category: string;
  note: string | null;
  prices: CateringTierPrice[];
  sort_order: number;
  is_available: boolean;
};

type CateringPackInput = {
  id: number;
  name: string;
  serves: string;
  price: string;
  description: string;
  includesText: string;
  tag: string;
  tag_bg: string;
  category: string;
  note: string;
  image_sizes: ImageUrlsMap;
  additional_images: MenuImageMoreEntry[];
  prices: CateringTierPrice[];
  sort_order: number;
  is_available: boolean;
};

const emptyTierPrice = (): CateringTierPrice => ({
  size: '',
  price: '',
  serves: '',
});

const emptyCateringPackInput = (): CateringPackInput => ({
  id: 0,
  name: '',
  serves: '',
  price: '',
  description: '',
  includesText: '',
  tag: '',
  tag_bg: '',
  category: 'Catering Packs',
  note: '',
  image_sizes: {},
  additional_images: [],
  prices: [],
  sort_order: 0,
  is_available: true,
});

function parseTierPrices(value: unknown): CateringTierPrice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        size: String(row.size ?? '').trim(),
        price: String(row.price ?? '').trim(),
        serves: String(row.serves ?? '').trim(),
      };
    })
    .filter((item) => item.size || item.price || item.serves);
}

function serializeTierPrices(rows: CateringTierPrice[]): CateringTierPrice[] {
  return rows
    .map((row) => ({
      size: row.size.trim(),
      price: row.price.trim(),
      serves: row.serves.trim(),
    }))
    .filter((row) => row.size && row.price && row.serves);
}

async function nextCateringPackId(): Promise<number> {
  const { data, error } = await supabase
    .from('catering_packs')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxId = data?.[0]?.id ?? 0;
  return Number(maxId) + 1;
}

export function CateringPacks() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia } = useSupabaseStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [packs, setPacks] = useState<CateringPackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CateringPackInput>(emptyCateringPackInput());
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingAdditionalImages, setIsUploadingAdditionalImages] =
    useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CateringPackRow | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loadCateringPacks = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('catering_packs')
        .select(
          'id, name, serves, price, description, includes, tag, tag_bg, image_url, image_urls, category, note, prices, sort_order, is_available',
        )
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;

      setPacks(
        (data ?? []).map((row) => {
          const pack = row as CateringPackRow;
          return {
            ...pack,
            prices: parseTierPrices(pack.prices),
          };
        }),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load catering packs.';
      setError(message);
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadCateringPacks();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadCateringPacks]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const pack of packs) {
      const category = pack.category?.trim();
      if (category) values.add(category);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [packs]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const filteredPacks = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = packs.filter((pack) => {
      if (categoryFilter !== 'all' && pack.category !== categoryFilter) {
        return false;
      }
      if (!term) return true;
      return (
        pack.name.toLowerCase().includes(term) ||
        pack.category.toLowerCase().includes(term) ||
        pack.serves.toLowerCase().includes(term) ||
        pack.price.toLowerCase().includes(term) ||
        pack.description.toLowerCase().includes(term) ||
        pack.tag.toLowerCase().includes(term) ||
        (pack.note ?? '').toLowerCase().includes(term) ||
        (pack.image_url ?? '').toLowerCase().includes(term)
      );
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortColumn === 'id') {
        return (a.id - b.id) * direction;
      }
      return a[sortColumn].localeCompare(b[sortColumn]) * direction;
    });
  }, [packs, search, categoryFilter, sortColumn, sortDirection]);

  const openCreate = async () => {
    try {
      const id = await nextCateringPackId();
      setEditingId(null);
      setForm({
        ...emptyCateringPackInput(),
        id,
        sort_order: packs.length,
      });
      setImagePreviewUrl(null);
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not prepare new catering pack.',
      );
    }
  };

  const openEdit = (pack: CateringPackRow) => {
    const parsedImages = parseMenuImageUrls(pack.image_urls);
    const legacySizes =
      Object.keys(parsedImages.sizes).length === 0 && pack.image_url
        ? { '1920': pack.image_url }
        : parsedImages.sizes;

    setEditingId(pack.id);
    setForm({
      id: pack.id,
      name: pack.name,
      serves: pack.serves ?? '',
      price: pack.price ?? '',
      description: pack.description ?? '',
      includesText: pack.includes.join('\n'),
      tag: pack.tag ?? '',
      tag_bg: pack.tag_bg ?? '',
      category: pack.category ?? 'Catering Packs',
      note: pack.note ?? '',
      image_sizes: legacySizes,
      additional_images: parsedImages.more,
      prices: pack.prices.length > 0 ? pack.prices : [],
      sort_order: pack.sort_order,
      is_available: pack.is_available,
    });
    setImagePreviewUrl(
      previewFromParsedMenuImages(
        { sizes: legacySizes, more: parsedImages.more },
        [...CATERING_IMAGE_UPLOAD_RESIZES],
      ) ?? pack.image_url,
    );
    setDialogOpen(true);
  };

  const slugPart = () =>
    slugFromName(form.name) || `catering-${form.id || 'new'}`;

  const handleImageUpload = async (input: File | File[]) => {
    const files = Array.isArray(input) ? input : [input];
    const sizes = [...CATERING_IMAGE_UPLOAD_RESIZES].sort((a, b) => a - b);

    if (files.length !== sizes.length) {
      toast.error('Unexpected number of resized image files.');
      return;
    }

    const baseSlug = slugPart();
    const timestamp = Date.now();

    setIsUploadingImages(true);
    try {
      const imageUrls: ImageUrlsMap = {};

      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${baseSlug}-${timestamp}_${size}.${ext}`;

        const { publicUrl } = await uploadMedia(file, {
          folder: 'catering-packs',
          fileName,
          upsert: true,
        });
        imageUrls[String(size)] = publicUrl;
      }

      setForm((prev) => ({ ...prev, image_sizes: imageUrls }));
      setImagePreviewUrl(previewFromImageUrls(imageUrls));
      toast.success('Catering images uploaded.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload catering images.';
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
    const baseSlug = slugPart();
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
        folder: 'catering-packs',
        fileName: `${baseSlug}-more-${index}-${timestamp}-sm.${ext}`,
        upsert: true,
      });
      const { publicUrl: lg } = await uploadMedia(lgFile, {
        folder: 'catering-packs',
        fileName: `${baseSlug}-more-${index}-${timestamp}-lg.${ext}`,
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
    if (!form.category.trim()) {
      toast.error('Category is required.');
      return;
    }

    const tierPrices = serializeTierPrices(form.prices);
    const includesValues = form.includesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (tierPrices.length === 0) {
      if (!form.serves.trim()) {
        toast.error('Serves is required when no tier prices are set.');
        return;
      }
      if (!form.price.trim()) {
        toast.error('Price is required when no tier prices are set.');
        return;
      }
      if (!form.description.trim()) {
        toast.error('Description is required when no tier prices are set.');
        return;
      }
      if (!form.tag.trim()) {
        toast.error('Tag is required when no tier prices are set.');
        return;
      }
      if (!form.tag_bg.trim()) {
        toast.error('Tag background class is required when no tier prices are set.');
        return;
      }
      if (includesValues.length === 0) {
        toast.error('At least one include line is required when no tier prices are set.');
        return;
      }
    }

    const image_urls = serializeMenuImageUrls(
      form.image_sizes,
      form.additional_images,
    );
    const image_url =
      previewFromParsedMenuImages(
        { sizes: form.image_sizes, more: form.additional_images },
        [...CATERING_IMAGE_UPLOAD_RESIZES],
      ) ?? null;

    setSaving(true);
    try {
      const payload = {
        id: form.id,
        name: form.name.trim(),
        serves: form.serves.trim(),
        price: form.price.trim(),
        description: form.description.trim(),
        includes: includesValues,
        tag: form.tag.trim(),
        tag_bg: form.tag_bg.trim(),
        image_url,
        image_urls,
        category: form.category.trim(),
        note: form.note.trim() || null,
        prices: tierPrices,
        sort_order: Number(form.sort_order) || 0,
        is_available: form.is_available,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('catering_packs')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Catering item updated.');
      } else {
        const { error: insertError } = await supabase
          .from('catering_packs')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Catering item created.');
      }

      setDialogOpen(false);
      await loadCateringPacks();
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
        .from('catering_packs')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Catering item deleted.');
      setDeleteTarget(null);
      await loadCateringPacks();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete catering item.',
      );
    } finally {
      setSaving(false);
    }
  };

  const updateTierPrice = (
    index: number,
    field: keyof CateringTierPrice,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      prices: prev.prices.map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const addTierPrice = () => {
    setForm((prev) => ({
      ...prev,
      prices: [...prev.prices, emptyTierPrice()],
    }));
  };

  const removeTierPrice = (index: number) => {
    setForm((prev) => ({
      ...prev,
      prices: prev.prices.filter((_, i) => i !== index),
    }));
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Catering Packs">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Catering Packs">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage catering items.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Catering Packs">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Catering items</CardTitle>
              <CardDescription>
                Manage catering packs and hot dishes shown on the public catering
                page.
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

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Input
                placeholder="Search name, category, tag, note..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="pack-category-filter" className="whitespace-nowrap">
                  Category
                </Label>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value)}
                >
                  <SelectTrigger id="pack-category-filter" className="w-56">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
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
            ) : filteredPacks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No catering items found. Add one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <SortableHeader
                        label="ID"
                        column="id"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Category"
                        column="category"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Name"
                        column="name"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Serves
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Tiers
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
                    {filteredPacks.map((pack) => (
                      <tr
                        key={pack.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">{pack.id}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pack.category}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {pack.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pack.serves || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pack.price || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pack.prices.length > 0 ? pack.prices.length : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={pack.is_available ? 'default' : 'secondary'}
                          >
                            {pack.is_available ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pack.sort_order}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(pack)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(pack)}
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit catering item' : 'Add catering item'}
            </DialogTitle>
            <DialogDescription>
              Use tier prices for hot dishes. Use single price, tag, and includes
              for standard catering packs.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <ImageUpload
                label="Primary image"
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
                uploadResizes={[...CATERING_IMAGE_UPLOAD_RESIZES]}
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
              <Label htmlFor="pack-id">ID</Label>
              <Input
                id="pack-id"
                type="number"
                value={form.id}
                disabled={editingId !== null}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pack-sort">Sort order</Label>
              <Input
                id="pack-sort"
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
              <Label htmlFor="pack-category">Category</Label>
              <Input
                id="pack-category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="Catering Packs"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="pack-name">Name</Label>
              <Input
                id="pack-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pack-serves">Serves</Label>
              <Input
                id="pack-serves"
                value={form.serves}
                onChange={(e) =>
                  setForm((f) => ({ ...f, serves: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pack-price">Price</Label>
              <Input
                id="pack-price"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                placeholder="$160"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pack-tag">Tag</Label>
              <Input
                id="pack-tag"
                value={form.tag}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tag: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pack-tag-bg">Tag background class</Label>
              <Input
                id="pack-tag-bg"
                value={form.tag_bg}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tag_bg: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="pack-description">Description</Label>
              <Textarea
                id="pack-description"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="pack-note">Note</Label>
              <Textarea
                id="pack-note"
                rows={2}
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder="Optional note shown on hot dishes"
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="pack-includes">Includes (one per line)</Label>
              <Textarea
                id="pack-includes"
                rows={5}
                value={form.includesText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, includesText: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-3 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label>Tier prices</Label>
                  <p className="text-xs text-muted-foreground">
                    Optional size/price/serves rows for hot dishes and platters.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTierPrice}
                  disabled={saving}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add tier
                </Button>
              </div>

              {form.prices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tier prices. Add tiers or use single price above.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.prices.map((tier, index) => (
                    <div
                      key={`tier-${index}`}
                      className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <div className="grid gap-1.5">
                        <Label htmlFor={`tier-size-${index}`}>Size</Label>
                        <Input
                          id={`tier-size-${index}`}
                          value={tier.size}
                          onChange={(e) =>
                            updateTierPrice(index, 'size', e.target.value)
                          }
                          placeholder="Small"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor={`tier-price-${index}`}>Price</Label>
                        <Input
                          id={`tier-price-${index}`}
                          value={tier.price}
                          onChange={(e) =>
                            updateTierPrice(index, 'price', e.target.value)
                          }
                          placeholder="$65"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor={`tier-serves-${index}`}>Serves</Label>
                        <Input
                          id={`tier-serves-${index}`}
                          value={tier.serves}
                          onChange={(e) =>
                            updateTierPrice(index, 'serves', e.target.value)
                          }
                          placeholder="5–7 People"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTierPrice(index)}
                          disabled={saving}
                          aria-label={`Remove tier ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="pack-available">Available</Label>
              <input
                id="pack-available"
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
            <AlertDialogTitle>Delete catering item?</AlertDialogTitle>
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
