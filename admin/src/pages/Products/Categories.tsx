import { DashboardLayout } from '@/components/layout';
import { ImageUpload } from '@/components/ImageUpload';
import { SearchableMultiSelect } from '@/components/SearchableMultiSelect';
import { SearchableSelect } from '@/components/SearchableSelect';
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
import { Badge } from '@/components/ui/badge';
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
import { slugify } from '@/pages/ResourcesHub/franchiseResourceShared';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ImageIcon,
  Layers,
  Loader2,
  Palette,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const CATEGORY_KINDS = ['menu', 'wholesale', 'catering'] as const;
type CategoryKind = (typeof CATEGORY_KINDS)[number];

const KIND_ACCENT: Record<
  CategoryKind,
  { header: string; badge: string; label: string }
> = {
  menu: {
    header: 'from-emerald-500/20 via-teal-500/10 to-cyan-500/10',
    badge:
      'border-emerald-300/70 bg-background/70 text-emerald-900 dark:text-emerald-200',
    label: 'Menu',
  },
  wholesale: {
    header: 'from-sky-500/20 via-blue-500/10 to-indigo-500/10',
    badge: 'border-sky-300/70 bg-background/70 text-sky-900 dark:text-sky-200',
    label: 'Wholesale',
  },
  catering: {
    header: 'from-amber-500/20 via-orange-500/10 to-rose-500/10',
    badge:
      'border-amber-300/70 bg-background/70 text-amber-900 dark:text-amber-200',
    label: 'Catering',
  },
};

function CategoryFormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  accentClass,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
  accentClass?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border p-4 shadow-xs',
        accentClass ?? 'border-border/70 bg-muted/20',
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3 border-b border-border/40 pb-3">
        {Icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-xs ring-1 ring-border/50">
            <Icon className="size-4 text-foreground/70" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function CategoryFormField({
  label,
  htmlFor,
  description,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid min-w-0 gap-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {description ? (
        <p className="-mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}

type SortColumn = 'id' | 'alias' | 'kind' | 'sort_order';
type SortDirection = 'asc' | 'desc';

type CustomizationOption = {
  id: number;
  kind: CategoryKind;
  key: string;
  title: string;
};

type CategoryGroupOption = {
  id: number;
  kind: CategoryKind;
  name: string;
  alias: string;
  sortOrder: number;
};

type CategoryRow = {
  id: number;
  kind: CategoryKind;
  sortOrder: number;
  categoryGroupId: number | null;
  categoryGroupName: string | null;
  alias: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  addon: string[];
  style: string | null;
  icon: string | null;
  customizationIds: number[];
};

type CategoryInput = {
  kind: CategoryKind;
  sortOrder: number;
  categoryGroupId: number | null;
  name: string;
  description: string;
  imageUrl: string;
  addon: string;
  style: string;
  icon: string;
  customizationIds: number[];
};

const emptyCategoryInput = (): CategoryInput => ({
  kind: 'menu',
  sortOrder: 0,
  categoryGroupId: null,
  name: '',
  description: '',
  imageUrl: '',
  addon: '',
  style: '',
  icon: '',
  customizationIds: [],
});

function formatCustomizationLabel(row: CustomizationOption): string {
  return `#${row.id} — ${row.title} (${row.key})`;
}

function isAliasDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const row = error as { code?: string; message?: string; details?: string };
  if (row.code !== '23505') return false;
  const haystack = `${row.message ?? ''} ${row.details ?? ''}`.toLowerCase();
  return haystack.includes('alias') || haystack.includes('categories');
}

function aliasWithIdSuffix(alias: string, id: number): string {
  return `${alias}-${id}`;
}

async function nextCategoryId(): Promise<number> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.id ?? 0) + 1;
}

type CategoryPayload = {
  kind: CategoryKind;
  sort_order: number;
  category_group_id: number | null;
  alias: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  addon: string[];
  style: string | null;
  icon: string | null;
  customization_ids: number[];
};

function InlineSortOrderInput({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  onCommit: (sortOrder: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = async () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setDraft(String(value));
      toast.error('Sort order must be a non-negative integer.');
      return;
    }
    if (parsed === value) return;

    setSaving(true);
    try {
      await onCommit(parsed);
    } catch {
      setDraft(String(value));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Input
      type="number"
      min={0}
      step={1}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      disabled={disabled || saving}
      className="h-8 w-20 font-mono text-sm"
      aria-label="Sort order"
    />
  );
}

function resolveCategoryGroupName(
  group: { name: string } | { name: string }[] | null | undefined,
): string | null {
  if (!group) return null;
  if (Array.isArray(group)) return group[0]?.name ?? null;
  return group.name ?? null;
}

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
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroupOption[]>([]);
  const [customizations, setCustomizations] = useState<CustomizationOption[]>([]);
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
  const [sortColumn, setSortColumn] = useState<SortColumn>('sort_order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [inlineSortSavingId, setInlineSortSavingId] = useState<number | null>(
    null,
  );

  const loadCategories = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select(
          'id, kind, sort_order, category_group_id, alias, name, description, imageUrl, addon, style, icon, customization_ids, category_groups(name)',
        )
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setCategories(
        (data ?? []).map((row) => {
          const group = row.category_groups as
            | { name: string }
            | { name: string }[]
            | null;
          return {
            id: row.id,
            kind: row.kind as CategoryKind,
            sortOrder: Number(row.sort_order ?? 0),
            categoryGroupId:
              row.category_group_id != null
                ? Number(row.category_group_id)
                : null,
            categoryGroupName: resolveCategoryGroupName(group),
            alias: row.alias,
            name: row.name,
            description: row.description,
            imageUrl: row.imageUrl,
            addon: row.addon ?? [],
            style: row.style,
            icon: row.icon,
            customizationIds: Array.isArray(row.customization_ids)
              ? row.customization_ids.map((id) => Number(id))
              : [],
          };
        }),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load categories.';
      setError(message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategoryGroups = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('category_groups')
        .select('id, kind, name, alias, sort_order')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setCategoryGroups(
        (data ?? []).map((row) => ({
          id: row.id,
          kind: row.kind as CategoryKind,
          name: row.name,
          alias: row.alias,
          sortOrder: Number(row.sort_order ?? 0),
        })),
      );
    } catch {
      setCategoryGroups([]);
    }
  }, []);

  const loadCustomizations = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('product_customizations')
        .select('id, kind, key, title')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setCustomizations((data ?? []) as CustomizationOption[]);
    } catch {
      setCustomizations([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadCategories();
      void loadCategoryGroups();
      void loadCustomizations();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadCategories, loadCategoryGroups, loadCustomizations]);

  const categoryGroupSelectOptions = useMemo(
    () =>
      categoryGroups
        .filter((group) => group.kind === form.kind)
        .map((group) => ({
          value: String(group.id),
          label: group.name,
        })),
    [categoryGroups, form.kind],
  );

  const customizationSelectOptions = useMemo(
    () =>
      customizations
        .filter((row) => row.kind === form.kind)
        .map((row) => ({
          value: String(row.id),
          label: formatCustomizationLabel(row),
        })),
    [customizations, form.kind],
  );

  const generatedAlias = useMemo(() => slugify(form.name), [form.name]);

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
        (cat.categoryGroupName ?? '').toLowerCase().includes(term) ||
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
      if (sortColumn === 'sort_order') {
        return (a.sortOrder - b.sortOrder || a.id - b.id) * direction;
      }
      return a[sortColumn].localeCompare(b[sortColumn]) * direction;
    });
  }, [categories, search, kindFilter, sortColumn, sortDirection]);

  const handleInlineSortOrderSave = useCallback(
    async (categoryId: number, sortOrder: number) => {
      setInlineSortSavingId(categoryId);
      try {
        const { error: updateError } = await supabase
          .from('categories')
          .update({ sort_order: sortOrder })
          .eq('id', categoryId);

        if (updateError) throw updateError;

        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === categoryId ? { ...cat, sortOrder } : cat,
          ),
        );
        toast.success('Sort order updated.');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to update sort order.',
        );
        throw err;
      } finally {
        setInlineSortSavingId(null);
      }
    },
    [],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyCategoryInput(),
      kind:
        kindFilter !== 'all' ? (kindFilter as CategoryKind) : 'menu',
      sortOrder: categories.length,
    });
    setImagePreviewUrl(null);
    setDialogOpen(true);
  };

  const openEdit = (category: CategoryRow) => {
    setEditing(category);
    setForm({
      kind: category.kind,
      sortOrder: category.sortOrder,
      categoryGroupId: category.categoryGroupId,
      name: category.name,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      addon: category.addon.join(', '),
      style: category.style ?? '',
      icon: category.icon ?? '',
      customizationIds: [...category.customizationIds],
    });
    setImagePreviewUrl(category.imageUrl ?? null);
    setDialogOpen(true);
  };

  const handleImageUpload = async (fileInputs: File | File[]) => {
    const file = Array.isArray(fileInputs) ? fileInputs[0] : fileInputs;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const aliasPart = slugify(form.name) || 'category';
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
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    const alias = slugify(form.name.trim());
    if (!alias) {
      toast.error('Name must produce a valid alias slug.');
      return;
    }

    const addonValues = form.addon
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const payload: CategoryPayload = {
        kind: form.kind,
        sort_order: Number(form.sortOrder) || 0,
        category_group_id: form.categoryGroupId,
        alias,
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        addon: addonValues,
        style: form.style.trim() || null,
        icon: form.icon.trim() || null,
        customization_ids: form.customizationIds,
      };

      if (editing) {
        let { error: updateError } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editing.id);

        if (updateError && isAliasDuplicateError(updateError)) {
          const retryPayload = {
            ...payload,
            alias: aliasWithIdSuffix(alias, editing.id),
          };
          ({ error: updateError } = await supabase
            .from('categories')
            .update(retryPayload)
            .eq('id', editing.id));
        }

        if (updateError) throw updateError;
        toast.success('Category updated.');
      } else {
        let { error: insertError } = await supabase
          .from('categories')
          .insert(payload);

        if (insertError && isAliasDuplicateError(insertError)) {
          const nextId = await nextCategoryId();
          ({ error: insertError } = await supabase.from('categories').insert({
            ...payload,
            alias: aliasWithIdSuffix(alias, nextId),
          }));
        }

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
                placeholder="Search kind, alias, name, group, style, icon or add-ons…"
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
                        label="Sort"
                        column="sort_order"
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
                        Group
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
                        <td className="px-4 py-3">
                          <InlineSortOrderInput
                            value={cat.sortOrder}
                            disabled={inlineSortSavingId === cat.id || saving}
                            onCommit={(sortOrder) =>
                              handleInlineSortOrderSave(cat.id, sortOrder)
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {cat.alias}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {cat.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {cat.categoryGroupName ?? '—'}
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
        <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <div
            className={cn(
              'shrink-0 border-b bg-gradient-to-r px-6 py-5',
              KIND_ACCENT[form.kind].header,
            )}
          >
            <DialogHeader className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn('gap-1.5', KIND_ACCENT[form.kind].badge)}
                >
                  <Layers className="size-3.5" aria-hidden />
                  {KIND_ACCENT[form.kind].label}
                </Badge>
                {editing ? (
                  <Badge variant="secondary" className="font-mono">
                    #{editing.id}
                  </Badge>
                ) : null}
                {generatedAlias ? (
                  <Badge
                    variant="outline"
                    className="border-violet-300/60 bg-violet-500/10 font-mono text-violet-900 dark:text-violet-200"
                  >
                    {generatedAlias}
                  </Badge>
                ) : null}
              </div>
              <DialogTitle className="text-xl">
                {editing ? 'Edit category' : 'Add category'}
              </DialogTitle>
              {form.name.trim() ? (
                <p className="text-sm font-medium text-foreground/80">
                  {form.name.trim()}
                </p>
              ) : null}
              <DialogDescription>
                The alias slug is generated from the name. Add-ons are
                comma-separated category aliases. Customizations apply to
                products in this category unless overridden per product.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
            <CategoryFormSection
              title="Media"
              description="Hero image shown on menu and category navigation."
              icon={ImageIcon}
              accentClass="border-sky-200/70 bg-gradient-to-br from-sky-50/80 to-background dark:border-sky-900/50 dark:from-sky-950/30"
            >
              <div className="space-y-4">
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
                <CategoryFormField label="Image URL" htmlFor="cat-image">
                  <Input
                    id="cat-image"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imageUrl: e.target.value }))
                    }
                    className="font-mono text-xs"
                  />
                </CategoryFormField>
              </div>
            </CategoryFormSection>

            <CategoryFormSection
              title="Display"
              description="Storefront grouping, ordering, and optional presentation tokens."
              icon={Palette}
              accentClass="border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-50/80 to-background dark:border-fuchsia-900/50 dark:from-fuchsia-950/30"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <CategoryFormField
                  label="Category group"
                  htmlFor="cat-group"
                  description="Optional same-kind group for storefront navigation."
                  className="sm:col-span-2"
                >
                  <SearchableSelect
                    id="cat-group"
                    options={categoryGroupSelectOptions}
                    value={
                      form.categoryGroupId != null
                        ? String(form.categoryGroupId)
                        : ''
                    }
                    onValueChange={(value) =>
                      setForm((f) => ({
                        ...f,
                        categoryGroupId: value ? Number(value) : null,
                      }))
                    }
                    placeholder={`Search ${form.kind} category groups…`}
                    emptyOption={{ value: '', label: 'None' }}
                    disabled={saving}
                  />
                </CategoryFormField>
                <CategoryFormField
                  label="Sort order"
                  htmlFor="cat-sort-order"
                  description="Lower numbers appear first in category lists."
                >
                  <Input
                    id="cat-sort-order"
                    type="number"
                    min={0}
                    step={1}
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sortOrder: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </CategoryFormField>
                <CategoryFormField label="Style" htmlFor="cat-style">
                  <Input
                    id="cat-style"
                    value={form.style}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, style: e.target.value }))
                    }
                    placeholder="category-banh-mi"
                  />
                </CategoryFormField>
                <CategoryFormField label="Icon" htmlFor="cat-icon">
                  <Input
                    id="cat-icon"
                    value={form.icon}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, icon: e.target.value }))
                    }
                    placeholder="sandwich"
                  />
                </CategoryFormField>
              </div>
            </CategoryFormSection>

            <CategoryFormSection
              title="Identity"
              description="Channel, display name, and optional blurb."
              icon={Layers}
              accentClass="border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-background dark:border-violet-900/50 dark:from-violet-950/30"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <CategoryFormField
                  label="Kind"
                  htmlFor="cat-kind"
                  className="sm:col-span-2"
                >
                  <Select
                    value={form.kind}
                    onValueChange={(value) => {
                      const nextKind = value as CategoryKind;
                      const allowedGroupIds = new Set(
                        categoryGroups
                          .filter((group) => group.kind === nextKind)
                          .map((group) => group.id),
                      );
                      const allowedIds = new Set(
                        customizations
                          .filter((row) => row.kind === nextKind)
                          .map((row) => row.id),
                      );
                      setForm((f) => ({
                        ...f,
                        kind: nextKind,
                        categoryGroupId:
                          f.categoryGroupId != null &&
                          allowedGroupIds.has(f.categoryGroupId)
                            ? f.categoryGroupId
                            : null,
                        customizationIds: f.customizationIds.filter((id) =>
                          allowedIds.has(id),
                        ),
                      }));
                    }}
                  >
                    <SelectTrigger id="cat-kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                      {CATEGORY_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {KIND_ACCENT[kind].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CategoryFormField>
                <CategoryFormField
                  label="Name"
                  htmlFor="cat-name"
                  className="sm:col-span-2"
                >
                  <Input
                    id="cat-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Bánh Mì"
                  />
                  <p className="font-mono text-xs text-muted-foreground">
                    {generatedAlias ? (
                      <>
                        Alias:{' '}
                        <span className="text-foreground/80">
                          {generatedAlias}
                        </span>
                      </>
                    ) : (
                      'Alias is generated from the name'
                    )}
                  </p>
                </CategoryFormField>
                <CategoryFormField
                  label="Description"
                  htmlFor="cat-description"
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="cat-description"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </CategoryFormField>
              </div>
            </CategoryFormSection>

            <CategoryFormSection
              title="Product behaviour"
              description="Add-on pairings and default customization groups for items in this category."
              icon={SlidersHorizontal}
              accentClass="border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-background dark:border-emerald-900/50 dark:from-emerald-950/30"
            >
              <div className="grid gap-4">
                <CategoryFormField
                  label="Add-ons"
                  htmlFor="cat-addon"
                  description="Comma-separated category aliases paired with this one (e.g. Drinks, Entrée)."
                >
                  <Input
                    id="cat-addon"
                    placeholder="Drinks, Entrée"
                    value={form.addon}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, addon: e.target.value }))
                    }
                  />
                </CategoryFormField>
                <CategoryFormField
                  label="Customizations"
                  htmlFor="cat-customizations"
                  description="Ordered groups applied when a product has no override. Selection order is preserved."
                >
                  <SearchableMultiSelect
                    id="cat-customizations"
                    options={customizationSelectOptions}
                    values={form.customizationIds.map(String)}
                    onValuesChange={(values) =>
                      setForm((f) => ({
                        ...f,
                        customizationIds: values.map((value) => Number(value)),
                      }))
                    }
                    disabled={saving}
                    placeholder="Search customization groups…"
                  />
                </CategoryFormField>
              </div>
            </CategoryFormSection>
          </div>

          <DialogFooter className="shrink-0 border-t bg-muted/20 px-6 py-4">
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
                'Save category'
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
