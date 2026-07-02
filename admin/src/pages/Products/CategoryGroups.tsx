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
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { slugify } from '@/pages/ResourcesHub/franchiseResourceShared';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FolderTree,
  ImageIcon,
  Layers3,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

type SortColumn = 'id' | 'alias' | 'sort_order';
type SortDirection = 'asc' | 'desc';

type CategoryGroupRow = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  alias: string;
};

type CategoryGroupInput = {
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
};

const emptyCategoryGroupInput = (): CategoryGroupInput => ({
  name: '',
  description: '',
  imageUrl: '',
  sortOrder: 0,
});

function GroupFormSection({
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

function GroupFormField({
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

function isAliasDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const row = error as { code?: string; message?: string; details?: string };
  if (row.code !== '23505') return false;
  const haystack = `${row.message ?? ''} ${row.details ?? ''}`.toLowerCase();
  return haystack.includes('alias') || haystack.includes('category_groups');
}

function aliasWithIdSuffix(alias: string, id: number): string {
  return `${alias}-${id}`;
}

async function nextCategoryGroupId(): Promise<number> {
  const { data, error } = await supabase
    .from('category_groups')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.id ?? 0) + 1;
}

type CategoryGroupPayload = {
  name: string;
  description: string | null;
  imageUrl: string | null;
  sort_order: number;
  alias: string;
};

export function CategoryGroups() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia, isUploading } = useSupabaseStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [groups, setGroups] = useState<CategoryGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryGroupRow | null>(null);
  const [form, setForm] = useState<CategoryGroupInput>(emptyCategoryGroupInput());
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CategoryGroupRow | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('sort_order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [inlineSortSavingId, setInlineSortSavingId] = useState<number | null>(
    null,
  );

  const loadGroups = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('category_groups')
        .select('id, name, description, imageUrl, sort_order, alias')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setGroups(
        (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          imageUrl: row.imageUrl,
          sortOrder: Number(row.sort_order ?? 0),
          alias: row.alias,
        })),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load category groups.';
      setError(message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadGroups();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadGroups]);

  const generatedAlias = useMemo(() => slugify(form.name), [form.name]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = groups.filter((group) => {
      if (!term) return true;
      return (
        group.alias.toLowerCase().includes(term) ||
        group.name.toLowerCase().includes(term) ||
        (group.description ?? '').toLowerCase().includes(term) ||
        (group.imageUrl ?? '').toLowerCase().includes(term)
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
  }, [groups, search, sortColumn, sortDirection]);

  const handleInlineSortOrderSave = useCallback(
    async (groupId: number, sortOrder: number) => {
      setInlineSortSavingId(groupId);
      try {
        const { error: updateError } = await supabase
          .from('category_groups')
          .update({ sort_order: sortOrder })
          .eq('id', groupId);

        if (updateError) throw updateError;

        setGroups((prev) =>
          prev.map((group) =>
            group.id === groupId ? { ...group, sortOrder } : group,
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
      ...emptyCategoryGroupInput(),
      sortOrder: groups.length,
    });
    setImagePreviewUrl(null);
    setDialogOpen(true);
  };

  const openEdit = (group: CategoryGroupRow) => {
    setEditing(group);
    setForm({
      name: group.name,
      description: group.description ?? '',
      imageUrl: group.imageUrl ?? '',
      sortOrder: group.sortOrder,
    });
    setImagePreviewUrl(group.imageUrl ?? null);
    setDialogOpen(true);
  };

  const handleImageUpload = async (fileInputs: File | File[]) => {
    const file = Array.isArray(fileInputs) ? fileInputs[0] : fileInputs;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const aliasPart = slugify(form.name) || 'category-group';
    const fileName = `${aliasPart}-${Date.now()}.${ext}`;

    try {
      const { publicUrl } = await uploadMedia(file, {
        folder: 'category-groups',
        fileName,
        upsert: true,
      });
      setForm((prev) => ({ ...prev, imageUrl: publicUrl }));
      setImagePreviewUrl(publicUrl);
      toast.success('Group image uploaded.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload group image.';
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

    setSaving(true);
    try {
      const payload: CategoryGroupPayload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        sort_order: Number(form.sortOrder) || 0,
        alias,
      };

      if (editing) {
        let { error: updateError } = await supabase
          .from('category_groups')
          .update(payload)
          .eq('id', editing.id);

        if (updateError && isAliasDuplicateError(updateError)) {
          const retryPayload = {
            ...payload,
            alias: aliasWithIdSuffix(alias, editing.id),
          };
          ({ error: updateError } = await supabase
            .from('category_groups')
            .update(retryPayload)
            .eq('id', editing.id));
        }

        if (updateError) throw updateError;
        toast.success('Category group updated.');
      } else {
        let { error: insertError } = await supabase
          .from('category_groups')
          .insert(payload);

        if (insertError && isAliasDuplicateError(insertError)) {
          const nextId = await nextCategoryGroupId();
          ({ error: insertError } = await supabase.from('category_groups').insert({
            ...payload,
            alias: aliasWithIdSuffix(alias, nextId),
          }));
        }

        if (insertError) throw insertError;
        toast.success('Category group created.');
      }

      setDialogOpen(false);
      await loadGroups();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save category group.',
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
        .from('category_groups')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Category group deleted.');
      setDeleteTarget(null);
      await loadGroups();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete category group.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Category groups">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Category groups">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage category groups.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Category groups">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Category groups</CardTitle>
              <CardDescription>
                Group related menu categories for storefront navigation and
                display.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadGroups()}
                disabled={loading}
              />
              <Button onClick={openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add group
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <Input
              placeholder="Search alias, name, description or image URL…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No category groups found. Add one to get started.
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
                        Description
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
                    {filteredGroups.map((group) => (
                      <tr
                        key={group.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">{group.id}</td>
                        <td className="px-4 py-3">
                          <InlineSortOrderInput
                            value={group.sortOrder}
                            disabled={inlineSortSavingId === group.id || saving}
                            onCommit={(sortOrder) =>
                              handleInlineSortOrderSave(group.id, sortOrder)
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {group.alias}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {group.name}
                        </td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-sm text-muted-foreground">
                          {group.description ?? '—'}
                        </td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-sm text-muted-foreground">
                          {group.imageUrl ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(group)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(group)}
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
          <div className="shrink-0 border-b bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-rose-500/10 px-6 py-5">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="gap-1.5 border-violet-300/70 bg-background/70 text-violet-900 dark:text-violet-200"
                >
                  <FolderTree className="size-3.5" aria-hidden />
                  Category group
                </Badge>
                {editing ? (
                  <Badge variant="secondary" className="font-mono">
                    #{editing.id}
                  </Badge>
                ) : null}
                {generatedAlias ? (
                  <Badge
                    variant="outline"
                    className="border-fuchsia-300/60 bg-fuchsia-500/10 font-mono text-fuchsia-900 dark:text-fuchsia-200"
                  >
                    {generatedAlias}
                  </Badge>
                ) : null}
              </div>
              <DialogTitle className="text-xl">
                {editing ? 'Edit category group' : 'Add category group'}
              </DialogTitle>
              {form.name.trim() ? (
                <p className="text-sm font-medium text-foreground/80">
                  {form.name.trim()}
                </p>
              ) : null}
              <DialogDescription>
                The alias slug is generated from the name. Assign categories to
                this group from the Categories page.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-5 lg:grid-cols-2">
            <GroupFormSection
              title="Hero image"
              description="Optional banner or thumbnail for this group on the storefront."
              icon={ImageIcon}
              accentClass="border-sky-200/70 bg-gradient-to-br from-sky-50/80 to-background dark:border-sky-900/50 dark:from-sky-950/30"
              className="lg:col-span-2"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
                <ImageUpload
                  label="Group image"
                  description="JPEG, PNG, WebP or GIF. Stored as a public URL."
                  value={imagePreviewUrl ?? form.imageUrl ?? null}
                  onFileSelect={handleImageUpload}
                  onClear={form.imageUrl ? handleImageClear : undefined}
                  isUploading={isUploading}
                  disabled={saving}
                  shape="square"
                />
                <GroupFormField
                  label="Image URL"
                  htmlFor="group-image-url"
                  description="Public URL saved to the database after upload."
                >
                  <Input
                    id="group-image-url"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imageUrl: e.target.value }))
                    }
                    className="font-mono text-xs"
                    placeholder="https://…"
                  />
                </GroupFormField>
              </div>
            </GroupFormSection>

            <GroupFormSection
              title="Identity"
              description="Display name and optional blurb shown with the group."
              icon={Layers3}
              accentClass="border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-background dark:border-violet-900/50 dark:from-violet-950/30"
            >
              <div className="grid gap-4">
                <GroupFormField label="Name" htmlFor="group-name">
                  <Input
                    id="group-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Vietnamese Classics"
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
                </GroupFormField>
                <GroupFormField label="Description" htmlFor="group-description">
                  <Textarea
                    id="group-description"
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </GroupFormField>
              </div>
            </GroupFormSection>

            <GroupFormSection
              title="Ordering"
              description="Controls where this group appears relative to others."
              icon={ListOrdered}
              accentClass="border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-background dark:border-amber-900/50 dark:from-amber-950/30"
            >
              <GroupFormField
                label="Sort order"
                htmlFor="group-sort-order"
                description="Lower numbers appear first. Zero is treated as unset on the storefront."
              >
                <Input
                  id="group-sort-order"
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
              </GroupFormField>
            </GroupFormSection>
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
                'Save group'
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
            <AlertDialogTitle>Delete category group?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.name}</strong>.
              Linked categories will have their group cleared. This cannot be
              undone.
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

export default CategoryGroups;
