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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useStorage } from '@/hooks/useStorage';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/useUserProfile';
import { slugify } from './franchiseResourceShared';
import supabase from '@/lib/supabase/client';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  CalendarRange,
  FileText,
  Folder,
  FolderOpen,
  GraduationCap,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const TAXONOMY_PLACES = ['announcement', 'document', 'academy'] as const;
type TaxonomyPlace = (typeof TAXONOMY_PLACES)[number];

const PLACE_META: Record<
  TaxonomyPlace,
  {
    label: string;
    description: string;
    icon: typeof FileText;
    badgeClass: string;
    sectionClass: string;
    pillActiveClass: string;
    headerGradient: string;
  }
> = {
  announcement: {
    label: 'Announcement',
    description: 'Taxonomies used in the announcements area of the hub.',
    icon: Megaphone,
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200',
    sectionClass: 'border-rose-200/70 bg-gradient-to-br from-rose-50/80 to-background dark:border-rose-900/50 dark:from-rose-950/30',
    pillActiveClass: 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30',
    headerGradient: 'from-rose-500/15 via-rose-400/5 to-transparent',
  },
  document: {
    label: 'Document',
    description: 'Taxonomies for document resources and the resources hub.',
    icon: FileText,
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-200',
    sectionClass: 'border-sky-200/70 bg-gradient-to-br from-sky-50/80 to-background dark:border-sky-900/50 dark:from-sky-950/30',
    pillActiveClass: 'border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/30',
    headerGradient: 'from-sky-500/15 via-sky-400/5 to-transparent',
  },
  academy: {
    label: 'Academy',
    description: 'Taxonomies for menu academy courses and training.',
    icon: GraduationCap,
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-200',
    sectionClass: 'border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-background dark:border-violet-900/50 dark:from-violet-950/30',
    pillActiveClass: 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30',
    headerGradient: 'from-violet-500/15 via-violet-400/5 to-transparent',
  },
};

const TAXONOMY_KINDS = ['folder', 'category', 'course', 'period'] as const;
type TaxonomyKind = (typeof TAXONOMY_KINDS)[number];

const KIND_META: Record<
  TaxonomyKind,
  {
    label: string;
    description: string;
    icon: typeof FolderOpen;
    badgeClass: string;
    sectionClass: string;
    pillActiveClass: string;
    headerGradient: string;
  }
> = {
  folder: {
    label: 'Folder',
    description: 'Container for grouping resources in the hub tree.',
    icon: Folder,
    badgeClass: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200',
    sectionClass: 'border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 to-background dark:border-indigo-900/50 dark:from-indigo-950/30',
    pillActiveClass: 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30',
    headerGradient: 'from-indigo-500/15 via-indigo-400/5 to-transparent',
  },
  category: {
    label: 'Category',
    description: 'Groups resources in the hub (e.g. Operations, Training).',
    icon: FolderOpen,
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-200',
    sectionClass: 'border-sky-200/70 bg-gradient-to-br from-sky-50/80 to-background dark:border-sky-900/50 dark:from-sky-950/30',
    pillActiveClass: 'border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/30',
    headerGradient: 'from-sky-500/15 via-sky-400/5 to-transparent',
  },
  course: {
    label: 'Course',
    description: 'Menu academy or training course identity.',
    icon: BookOpen,
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
    sectionClass: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-background dark:border-emerald-900/50 dark:from-emerald-950/30',
    pillActiveClass: 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30',
    headerGradient: 'from-emerald-500/15 via-emerald-400/5 to-transparent',
  },
  period: {
    label: 'Period',
    description: 'Time-bound label (e.g. Q1 2025, Summer rollout).',
    icon: CalendarRange,
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
    sectionClass: 'border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-background dark:border-amber-900/50 dark:from-amber-950/30',
    pillActiveClass: 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30',
    headerGradient: 'from-amber-500/15 via-amber-400/5 to-transparent',
  },
};

const formGridClass = 'grid gap-4 md:grid-cols-2';

type SortColumn = 'id' | 'kind' | 'alias' | 'sort_order';
type SortDirection = 'asc' | 'desc';

type TaxonomyRow = {
  id: number;
  place: TaxonomyPlace;
  kind: TaxonomyKind;
  alias: string;
  label: string;
  icon: string | null;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type TaxonomyInput = {
  place: TaxonomyPlace;
  kind: TaxonomyKind;
  label: string;
  icon: string;
  image_url: string;
  description: string;
  sort_order: string;
  is_active: 'true' | 'false';
};

const emptyTaxonomyInput = (): TaxonomyInput => ({
  place: 'document',
  kind: 'category',
  label: '',
  icon: '',
  image_url: '',
  description: '',
  sort_order: '0',
  is_active: 'true',
});

function resolveImagePreview(
  imageUrl: string | null | undefined,
  getPublicUrl: (path: string) => string,
): string | null {
  const value = imageUrl?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return getPublicUrl(value);
}

function TaxonomyFormSection({
  title,
  description,
  children,
  className,
  accentClass,
}: {
  title: string;
  description?: string;
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
      <div className="mb-4 border-b border-border/40 pb-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function TaxonomyFormField({
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

export default function Taxonomies() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia, isUploading, getPublicUrl } = useStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [rows, setRows] = useState<TaxonomyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [form, setForm] = useState<TaxonomyInput>(emptyTaxonomyInput());
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<TaxonomyRow | null>(null);
  const [search, setSearch] = useState('');
  const [placeFilter, setPlaceFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('kind');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loadRows = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('franchise_resource_taxonomies')
        .select(
          'id, place, kind, alias, label, icon, image_url, description, sort_order, is_active, created_at, updated_at',
        )
        .order('place', { ascending: true })
        .order('kind', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true });

      if (fetchError) throw fetchError;
      setRows((data ?? []) as TaxonomyRow[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load taxonomies.';
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadRows();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadRows]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (placeFilter !== 'all' && row.place !== placeFilter) return false;
      if (kindFilter !== 'all' && row.kind !== kindFilter) return false;
      if (activeFilter === 'active' && !row.is_active) return false;
      if (activeFilter === 'inactive' && row.is_active) return false;
      if (!term) return true;
      return (
        row.place.toLowerCase().includes(term) ||
        row.kind.toLowerCase().includes(term) ||
        row.alias.toLowerCase().includes(term) ||
        row.label.toLowerCase().includes(term) ||
        (row.description ?? '').toLowerCase().includes(term) ||
        (row.icon ?? '').toLowerCase().includes(term) ||
        (row.image_url ?? '').toLowerCase().includes(term)
      );
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortColumn === 'id') return (a.id - b.id) * direction;
      if (sortColumn === 'sort_order') {
        return (a.sort_order - b.sort_order) * direction;
      }
      return a[sortColumn].localeCompare(b[sortColumn]) * direction;
    });
  }, [rows, search, placeFilter, kindFilter, activeFilter, sortColumn, sortDirection]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyTaxonomyInput(),
      place: placeFilter !== 'all' ? (placeFilter as TaxonomyPlace) : 'document',
      kind: kindFilter !== 'all' ? (kindFilter as TaxonomyKind) : 'category',
    });
    setImagePreviewUrl(null);
    setDialogOpen(true);
  };

  const openEdit = (row: TaxonomyRow) => {
    setEditing(row);
    setForm({
      place: row.place,
      kind: row.kind,
      label: row.label,
      icon: row.icon ?? '',
      image_url: row.image_url ?? '',
      description: row.description ?? '',
      sort_order: String(row.sort_order),
      is_active: row.is_active ? 'true' : 'false',
    });
    setImagePreviewUrl(resolveImagePreview(row.image_url, getPublicUrl));
    setDialogOpen(true);
  };

  const handleImageUpload = async (fileInputs: File | File[]) => {
    const file = Array.isArray(fileInputs) ? fileInputs[0] : fileInputs;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const aliasPart = slugify(form.label) || form.kind;
    const fileName = `${form.place}-${form.kind}-${aliasPart}-${Date.now()}.${ext}`;

    try {
      const { publicUrl } = await uploadMedia(file, {
        folder: 'franchise-taxonomies',
        fileName,
        upsert: true,
      });
      setForm((prev) => ({ ...prev, image_url: publicUrl }));
      setImagePreviewUrl(publicUrl);
      toast.success('Taxonomy image uploaded.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload taxonomy image.';
      toast.error(message);
      throw err;
    }
  };

  const handleImageClear = () => {
    setForm((prev) => ({ ...prev, image_url: '' }));
    setImagePreviewUrl(null);
  };

  const handleSave = async () => {
    const label = form.label.trim();
    const alias = slugify(label);

    if (!alias) {
      toast.error('Label must produce a valid alias (letters and numbers).');
      return;
    }
    if (!label) {
      toast.error('Label is required.');
      return;
    }

    const sortOrder = Number.parseInt(form.sort_order, 10);
    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      toast.error('Sort order must be a non-negative number.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        place: form.place,
        kind: form.kind,
        alias,
        label,
        icon: form.icon.trim() || null,
        image_url: form.image_url.trim() || null,
        description: form.description.trim() || null,
        sort_order: sortOrder,
        is_active: form.is_active === 'true',
      };

      if (editing) {
        const { error: updateError } = await supabase
          .from('franchise_resource_taxonomies')
          .update(payload)
          .eq('id', editing.id);

        if (updateError) throw updateError;
        toast.success('Taxonomy updated.');
      } else {
        const { error: insertError } = await supabase
          .from('franchise_resource_taxonomies')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Taxonomy created.');
      }

      setDialogOpen(false);
      await loadRows();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save taxonomy.',
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
        .from('franchise_resource_taxonomies')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Taxonomy deleted.');
      setDeleteTarget(null);
      await loadRows();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete taxonomy.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Taxonomies">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Taxonomies">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage franchise resource taxonomies.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Taxonomies">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Franchise resource taxonomies</CardTitle>
              <CardDescription>
                Manage folder, category, course, and period identities across
                announcement, document, and academy hub areas.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadRows()}
                disabled={loading}
              />
              <Button onClick={openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add taxonomy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Input
                placeholder="Search place, kind, alias, label, icon, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="taxonomy-place-filter" className="whitespace-nowrap">
                    Place
                  </Label>
                  <Select value={placeFilter} onValueChange={setPlaceFilter}>
                    <SelectTrigger id="taxonomy-place-filter" className="w-36">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {TAXONOMY_PLACES.map((place) => (
                        <SelectItem key={place} value={place}>
                          {PLACE_META[place].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="taxonomy-kind-filter" className="whitespace-nowrap">
                    Kind
                  </Label>
                  <Select value={kindFilter} onValueChange={setKindFilter}>
                    <SelectTrigger id="taxonomy-kind-filter" className="w-36">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {TAXONOMY_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="taxonomy-active-filter" className="whitespace-nowrap">
                    Status
                  </Label>
                  <Select value={activeFilter} onValueChange={setActiveFilter}>
                    <SelectTrigger id="taxonomy-active-filter" className="w-36">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No taxonomies found. Add one to get started.
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
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Place
                      </th>
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
                        Label
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Icon
                      </th>
                      <SortableHeader
                        label="Sort"
                        column="sort_order"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Active
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Image
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const placeMeta = PLACE_META[row.place];
                      const PlaceIcon = placeMeta.icon;
                      const kindMeta = KIND_META[row.kind];
                      const KindIcon = kindMeta.icon;
                      return (
                      <tr
                        key={row.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">{row.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            variant="outline"
                            className={cn('gap-1 capitalize', placeMeta.badgeClass)}
                          >
                            <PlaceIcon className="h-3 w-3" />
                            {row.place}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            variant="outline"
                            className={cn(
                              'gap-1 capitalize',
                              kindMeta.badgeClass,
                            )}
                          >
                            <KindIcon className="h-3 w-3" />
                            {row.kind}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {row.alias}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {row.label}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {row.icon ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {row.sort_order}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.is_active ? (
                            <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-sm text-muted-foreground">
                          {row.image_url ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(row)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl">
          {(() => {
            const placeStyle = PLACE_META[form.place];
            const PlaceIcon = placeStyle.icon;
            const kindStyle = KIND_META[form.kind];
            const KindIcon = kindStyle.icon;
            const generatedAlias = slugify(form.label);
            return (
              <>
                <div
                  className={cn(
                    'border-b bg-gradient-to-r px-6 py-5',
                    placeStyle.headerGradient,
                  )}
                >
                  <DialogHeader className="space-y-3 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('gap-1.5 capitalize', placeStyle.badgeClass)}
                      >
                        <PlaceIcon className="h-3.5 w-3.5" />
                        {form.place}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('gap-1.5 capitalize', kindStyle.badgeClass)}
                      >
                        <KindIcon className="h-3.5 w-3.5" />
                        {form.kind}
                      </Badge>
                      {form.is_active === 'true' ? (
                        <Badge className="border-emerald-200 bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <DialogTitle className="text-xl">
                      {editing ? 'Edit taxonomy' : 'Add taxonomy'}
                    </DialogTitle>
                    <DialogDescription>
                      The alias slug is generated automatically from the label.
                      Each alias is unique within its kind.
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="max-h-[min(68vh,640px)] overflow-y-auto px-6 py-5">
                  <div className="flex flex-col gap-5">
                    <TaxonomyFormSection
                      title="Place"
                      description="Which hub area this taxonomy belongs to."
                      accentClass={placeStyle.sectionClass}
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        {TAXONOMY_PLACES.map((place) => {
                          const meta = PLACE_META[place];
                          const Icon = meta.icon;
                          const selected = form.place === place;
                          return (
                            <button
                              key={place}
                              type="button"
                              disabled={editing !== null || saving}
                              onClick={() => setForm((f) => ({ ...f, place }))}
                              className={cn(
                                'flex flex-col items-start gap-2 rounded-lg border bg-background/80 p-3 text-left transition-all',
                                'hover:border-primary/30 hover:bg-background',
                                'disabled:cursor-not-allowed disabled:opacity-60',
                                selected
                                  ? meta.pillActiveClass
                                  : 'border-border/60',
                              )}
                            >
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
                                  meta.badgeClass,
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {place}
                              </span>
                              <span className="text-xs leading-relaxed text-muted-foreground">
                                {meta.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </TaxonomyFormSection>

                    <TaxonomyFormSection
                      title="Kind"
                      description="Choose what type of taxonomy you are creating."
                      accentClass={kindStyle.sectionClass}
                    >
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {TAXONOMY_KINDS.map((kind) => {
                          const meta = KIND_META[kind];
                          const Icon = meta.icon;
                          const selected = form.kind === kind;
                          return (
                            <button
                              key={kind}
                              type="button"
                              disabled={editing !== null || saving}
                              onClick={() => setForm((f) => ({ ...f, kind }))}
                              className={cn(
                                'flex flex-col items-start gap-2 rounded-lg border bg-background/80 p-3 text-left transition-all',
                                'hover:border-primary/30 hover:bg-background',
                                'disabled:cursor-not-allowed disabled:opacity-60',
                                selected
                                  ? meta.pillActiveClass
                                  : 'border-border/60',
                              )}
                            >
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
                                  meta.badgeClass,
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {kind}
                              </span>
                              <span className="text-xs leading-relaxed text-muted-foreground">
                                {meta.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </TaxonomyFormSection>

                    <TaxonomyFormSection
                      title="Visual identity"
                      description="Image and icon shown alongside this taxonomy in the hub."
                      accentClass="border-violet-200/70 bg-gradient-to-br from-violet-50/70 to-background dark:border-violet-900/50 dark:from-violet-950/25"
                    >
                      <div className={formGridClass}>
                        <TaxonomyFormField
                          label="Taxonomy image"
                          className="md:col-span-2"
                        >
                          <ImageUpload
                            description="JPEG, PNG, WebP or GIF. Upload stores the public URL automatically."
                            value={imagePreviewUrl ?? form.image_url ?? null}
                            onFileSelect={handleImageUpload}
                            onClear={form.image_url ? handleImageClear : undefined}
                            isUploading={isUploading}
                            disabled={saving}
                            shape="square"
                          />
                        </TaxonomyFormField>

                        <TaxonomyFormField
                          label="Image URL"
                          htmlFor="taxonomy-image-url"
                          description="Optional manual override"
                        >
                          <Input
                            id="taxonomy-image-url"
                            value={form.image_url}
                            onChange={(e) => {
                              const next = e.target.value;
                              setForm((f) => ({ ...f, image_url: next }));
                              setImagePreviewUrl(
                                resolveImagePreview(next, getPublicUrl),
                              );
                            }}
                            className="font-mono text-sm"
                            placeholder="https://…"
                          />
                        </TaxonomyFormField>

                        <TaxonomyFormField
                          label="Icon"
                          htmlFor="taxonomy-icon"
                          description="Lucide icon name or emoji"
                        >
                          <Input
                            id="taxonomy-icon"
                            value={form.icon}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, icon: e.target.value }))
                            }
                            placeholder="book-open"
                          />
                        </TaxonomyFormField>
                      </div>
                    </TaxonomyFormSection>

                    <TaxonomyFormSection
                      title="Labels"
                      description="Human-readable name and auto-generated alias used in filters."
                      accentClass={kindStyle.sectionClass}
                    >
                      <div className={formGridClass}>
                        <TaxonomyFormField
                          label="Label"
                          htmlFor="taxonomy-label"
                          className="md:col-span-2"
                        >
                          <Input
                            id="taxonomy-label"
                            value={form.label}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, label: e.target.value }))
                            }
                            placeholder="Q1 2025"
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
                              'Alias is generated from the label'
                            )}
                          </p>
                        </TaxonomyFormField>

                        <TaxonomyFormField
                          label="Description"
                          htmlFor="taxonomy-description"
                          className="md:col-span-2"
                        >
                          <Textarea
                            id="taxonomy-description"
                            rows={3}
                            value={form.description}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Optional notes for admins…"
                          />
                        </TaxonomyFormField>
                      </div>
                    </TaxonomyFormSection>

                    <TaxonomyFormSection
                      title="Display & status"
                      description="Control list ordering and whether this taxonomy is selectable."
                      accentClass="border-rose-200/60 bg-gradient-to-br from-rose-50/50 to-background dark:border-rose-900/40 dark:from-rose-950/20"
                    >
                      <div className={formGridClass}>
                        <TaxonomyFormField label="Sort order" htmlFor="taxonomy-sort">
                          <Input
                            id="taxonomy-sort"
                            type="number"
                            min={0}
                            value={form.sort_order}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                sort_order: e.target.value,
                              }))
                            }
                          />
                        </TaxonomyFormField>

                        <div className="grid gap-2">
                          <Label>Status</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setForm((f) => ({ ...f, is_active: 'true' }))
                              }
                              className={cn(
                                'rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                                form.is_active === 'true'
                                  ? 'border-emerald-500 bg-emerald-500/10 font-medium text-emerald-800 ring-2 ring-emerald-500/25 dark:text-emerald-200'
                                  : 'border-border/60 bg-background hover:bg-muted/40',
                              )}
                            >
                              Active
                              <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                                Visible in filters
                              </p>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((f) => ({ ...f, is_active: 'false' }))
                              }
                              className={cn(
                                'rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                                form.is_active === 'false'
                                  ? 'border-muted-foreground/40 bg-muted/50 font-medium ring-2 ring-muted-foreground/20'
                                  : 'border-border/60 bg-background hover:bg-muted/40',
                              )}
                            >
                              Inactive
                              <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                                Hidden from hub
                              </p>
                            </button>
                          </div>
                        </div>
                      </div>
                    </TaxonomyFormSection>
                  </div>
                </div>

                <DialogFooter className="border-t bg-muted/20 px-6 py-4">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Save taxonomy
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete taxonomy?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{' '}
              <strong>
                {deleteTarget?.place} / {deleteTarget?.kind} / {deleteTarget?.label}
              </strong>{' '}
              ({deleteTarget?.alias}). Linked franchise resources will lose this
              reference.
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
