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
  image_url: string;
  sort_order: number;
  is_available: boolean;
};

const emptyCateringPackInput = (): CateringPackInput => ({
  id: 0,
  name: '',
  serves: '',
  price: '',
  description: '',
  includesText: '',
  tag: '',
  tag_bg: '',
  image_url: '',
  sort_order: 0,
  is_available: true,
});

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
  const { uploadMedia, isUploading } = useSupabaseStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [packs, setPacks] = useState<CateringPackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CateringPackInput>(emptyCateringPackInput());
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CateringPackRow | null>(null);
  const [search, setSearch] = useState('');

  const loadCateringPacks = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('catering_packs')
        .select(
          'id, name, serves, price, description, includes, tag, tag_bg, image_url, sort_order, is_available',
        )
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setPacks((data ?? []) as CateringPackRow[]);
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

  const filteredPacks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return packs;
    return packs.filter((pack) => {
      return (
        pack.name.toLowerCase().includes(term) ||
        pack.serves.toLowerCase().includes(term) ||
        pack.price.toLowerCase().includes(term) ||
        pack.description.toLowerCase().includes(term) ||
        pack.tag.toLowerCase().includes(term) ||
        pack.tag_bg.toLowerCase().includes(term) ||
        (pack.image_url ?? '').toLowerCase().includes(term)
      );
    });
  }, [packs, search]);

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
    setEditingId(pack.id);
    setForm({
      id: pack.id,
      name: pack.name,
      serves: pack.serves,
      price: pack.price,
      description: pack.description,
      includesText: pack.includes.join('\n'),
      tag: pack.tag,
      tag_bg: pack.tag_bg,
      image_url: pack.image_url ?? '',
      sort_order: pack.sort_order,
      is_available: pack.is_available,
    });
    setImagePreviewUrl(pack.image_url ?? null);
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const slugPart =
      form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
      'catering-pack';
    const fileName = `${slugPart}-${Date.now()}.${ext}`;

    try {
      const { path, signedUrl } = await uploadMedia(file, {
        folder: 'catering-packs',
        fileName,
        upsert: true,
      });
      setForm((prev) => ({ ...prev, image_url: path }));
      setImagePreviewUrl(signedUrl);
      toast.success('Catering pack image uploaded.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to upload catering pack image.';
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
    if (!form.serves.trim()) {
      toast.error('Serves is required.');
      return;
    }
    if (!form.price.trim()) {
      toast.error('Price is required.');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Description is required.');
      return;
    }
    if (!form.tag.trim()) {
      toast.error('Tag is required.');
      return;
    }
    if (!form.tag_bg.trim()) {
      toast.error('Tag background class is required.');
      return;
    }

    const includesValues = form.includesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (includesValues.length === 0) {
      toast.error('At least one include line is required.');
      return;
    }

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
        image_url: form.image_url.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_available: form.is_available,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('catering_packs')
          .update({
            name: payload.name,
            serves: payload.serves,
            price: payload.price,
            description: payload.description,
            includes: payload.includes,
            tag: payload.tag,
            tag_bg: payload.tag_bg,
            image_url: payload.image_url,
            sort_order: payload.sort_order,
            is_available: payload.is_available,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Catering pack updated.');
      } else {
        const { error: insertError } = await supabase
          .from('catering_packs')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Catering pack created.');
      }

      setDialogOpen(false);
      await loadCateringPacks();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save catering pack.',
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
      toast.success('Catering pack deleted.');
      setDeleteTarget(null);
      await loadCateringPacks();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete catering pack.',
      );
    } finally {
      setSaving(false);
    }
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
              Only administrators can manage catering packs.
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
              <CardTitle>Catering packs</CardTitle>
              <CardDescription>
                Manage catering packages shown on the public catering page.
              </CardDescription>
            </div>
            <Button onClick={() => void openCreate()} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add catering pack
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Input
              placeholder="Search name, serves, price, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPacks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No catering packs found. Add one to get started.
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
                        Serves
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Tag
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
                        <td className="px-4 py-3 text-sm font-medium">
                          {pack.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pack.serves}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pack.price}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pack.tag}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit catering pack' : 'Add catering pack'}
            </DialogTitle>
            <DialogDescription>
              Includes should be one line per item.
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
              <Label htmlFor="pack-image-url">Image URL</Label>
              <Input
                id="pack-image-url"
                value={form.image_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image_url: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="pack-description">Description</Label>
              <Textarea
                id="pack-description"
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
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
            <AlertDialogTitle>Delete catering pack?</AlertDialogTitle>
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
