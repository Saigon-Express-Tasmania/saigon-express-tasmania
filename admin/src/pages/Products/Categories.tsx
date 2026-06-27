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

const CATEGORY_KINDS = ['menu', 'wholesale', 'catering'] as const;
type CategoryKind = (typeof CATEGORY_KINDS)[number];

type SortColumn = 'id' | 'alias' | 'kind';
type SortDirection = 'asc' | 'desc';

type CategoryRow = {
  id: number;
  kind: CategoryKind;
  alias: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  addon: string[];
  style: string | null;
  icon: string | null;
};

type CategoryInput = {
  kind: CategoryKind;
  alias: string;
  name: string;
  description: string;
  imageUrl: string;
  addon: string;
  style: string;
  icon: string;
};

const emptyCategoryInput = (): CategoryInput => ({
  kind: 'menu',
  alias: '',
  name: '',
  description: '',
  imageUrl: '',
  addon: '',
  style: '',
  icon: '',
});

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

export function Categories() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia, isUploading } = useSupabaseStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState<CategoryInput>(emptyCategoryInput());
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('alias');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loadCategories = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('id, kind, alias, name, description, imageUrl, addon, style, icon')
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setCategories((data ?? []) as CategoryRow[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load categories.';
      setError(message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadCategories();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadCategories]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = categories.filter((cat) => {
      if (kindFilter !== 'all' && cat.kind !== kindFilter) {
        return false;
      }
      if (!term) return true;
      return (
        cat.kind.toLowerCase().includes(term) ||
        cat.alias.toLowerCase().includes(term) ||
        cat.name.toLowerCase().includes(term) ||
        (cat.description ?? '').toLowerCase().includes(term) ||
        (cat.imageUrl ?? '').toLowerCase().includes(term) ||
        (cat.style ?? '').toLowerCase().includes(term) ||
        (cat.icon ?? '').toLowerCase().includes(term) ||
        cat.addon.join(' ').toLowerCase().includes(term)
      );
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortColumn === 'id') {
        return (a.id - b.id) * direction;
      }
      return a[sortColumn].localeCompare(b[sortColumn]) * direction;
    });
  }, [categories, search, kindFilter, sortColumn, sortDirection]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyCategoryInput(),
      kind:
        kindFilter !== 'all' ? (kindFilter as CategoryKind) : 'menu',
    });
    setImagePreviewUrl(null);
    setDialogOpen(true);
  };

  const openEdit = (category: CategoryRow) => {
    setEditing(category);
    setForm({
      kind: category.kind,
      alias: category.alias,
      name: category.name,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      addon: category.addon.join(', '),
      style: category.style ?? '',
      icon: category.icon ?? '',
    });
    setImagePreviewUrl(category.imageUrl ?? null);
    setDialogOpen(true);
  };

  const handleImageUpload = async (fileInputs: File | File[]) => {
    const file = Array.isArray(fileInputs) ? fileInputs[0] : fileInputs;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const aliasPart = form.alias.trim().toLowerCase().replace(/\s+/g, '-') || 'category';
    const fileName = `${aliasPart}-${Date.now()}.${ext}`;

    try {
      const { path, signedUrl } = await uploadMedia(file, {
        folder: 'categories',
        fileName,
        upsert: true,
      });
      setForm((prev) => ({ ...prev, imageUrl: path }));
      setImagePreviewUrl(signedUrl);
      toast.success('Category image uploaded.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload category image.';
      toast.error(message);
      throw err;
    }
  };

  const handleImageClear = () => {
    setForm((prev) => ({ ...prev, imageUrl: '' }));
    setImagePreviewUrl(null);
  };

  const handleSave = async () => {
    if (!form.alias.trim()) {
      toast.error('Alias is required.');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    const addonValues = form.addon
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const payload = {
        kind: form.kind,
        alias: form.alias.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        addon: addonValues,
        style: form.style.trim() || null,
        icon: form.icon.trim() || null,
      };

      if (editing) {
        const { error: updateError } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editing.id);

        if (updateError) throw updateError;
        toast.success('Category updated.');
      } else {
        const { error: insertError } = await supabase
          .from('categories')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Category created.');
      }

      setDialogOpen(false);
      await loadCategories();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save category.',
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
        .from('categories')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Category deleted.');
      setDeleteTarget(null);
      await loadCategories();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete category.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Categories">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Categories">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage categories.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Categories">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Manage category alias, image, and add-on pairings used by the
                menu.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadCategories()}
                disabled={loading}
              />
              <Button onClick={openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add category
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Search kind, alias, name, style, icon or add-ons…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="cat-kind-filter" className="whitespace-nowrap">
                  Kind
                </Label>
                <Select
                  value={kindFilter}
                  onValueChange={(value) => setKindFilter(value)}
                >
                  <SelectTrigger id="cat-kind-filter" className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {CATEGORY_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {kind}
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
            ) : filteredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories found. Add one to get started.
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
                        label="Kind"
                        column="kind"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Alias"
                        column="alias"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Style
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Icon
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Add-ons
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Image URL
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((cat) => (
                      <tr
                        key={cat.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">{cat.id}</td>
                        <td className="px-4 py-3 text-sm capitalize text-muted-foreground">
                          {cat.kind}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {cat.alias}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {cat.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {cat.style ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {cat.icon ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {cat.addon.length > 0 ? cat.addon.join(', ') : '—'}
                        </td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-sm text-muted-foreground">
                          {cat.imageUrl ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(cat)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(cat)}
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
              {editing ? 'Edit category' : 'Add category'}
            </DialogTitle>
            <DialogDescription>
              Alias is used as the key. Add-ons are comma-separated aliases.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <ImageUpload
                label="Category image"
                description="JPEG, PNG, WebP or GIF. Upload to fill image URL automatically."
                value={imagePreviewUrl ?? form.imageUrl ?? null}
                onFileSelect={handleImageUpload}
                onClear={form.imageUrl ? handleImageClear : undefined}
                isUploading={isUploading}
                disabled={saving}
                shape="square"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-kind">Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, kind: value as CategoryKind }))
                }
              >
                <SelectTrigger id="cat-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {kind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-alias">Alias</Label>
              <Input
                id="cat-alias"
                value={form.alias}
                onChange={(e) =>
                  setForm((f) => ({ ...f, alias: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cat-image">Image URL</Label>
              <Input
                id="cat-image"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-style">Style</Label>
              <Input
                id="cat-style"
                value={form.style}
                onChange={(e) =>
                  setForm((f) => ({ ...f, style: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-icon">Icon</Label>
              <Input
                id="cat-icon"
                value={form.icon}
                onChange={(e) =>
                  setForm((f) => ({ ...f, icon: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cat-addon">Add-ons</Label>
              <Input
                id="cat-addon"
                placeholder="Drinks, Entrée"
                value={form.addon}
                onChange={(e) =>
                  setForm((f) => ({ ...f, addon: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cat-description">Description</Label>
              <Textarea
                id="cat-description"
                rows={3}
                value={form.description}
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
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.alias}</strong>.
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
