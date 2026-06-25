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
import { Pagination } from '@/components/ui/pagination';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTablePagination } from '@/hooks/useTablePagination';
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
import { FranchiseResourceEditorDialog } from './FranchiseResourceEditorDialog';
import {
  normalizeResourceRow,
  RESOURCE_COLUMNS,
  type FranchiseResourcePageConfig,
  type FranchiseResourceRow,
  type SortColumn,
  type SortDirection,
} from './franchiseResourceShared';
import {
  useFranchiseResourceEditor,
  useFranchiseResourceTaxonomies,
} from './useFranchiseResourceEditor';

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

type FranchiseResourceAdminPageProps = {
  config: FranchiseResourcePageConfig;
};

export function FranchiseResourceAdminPage({
  config,
}: FranchiseResourceAdminPageProps) {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';
  const { labels, theme, resourceType, taxonomyPlace, taxonomyKinds } = config;
  const ListIcon = theme.icon;

  const [resources, setResources] = useState<FranchiseResourceRow[]>([]);
  const { taxonomies, loadTaxonomies } = useFranchiseResourceTaxonomies(
    taxonomyPlace,
    taxonomyKinds,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteTarget, setDeleteTarget] = useState<FranchiseResourceRow | null>(
    null,
  );

  const loadResources = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('franchise_resources')
        .select(RESOURCE_COLUMNS)
        .eq('type', resourceType)
        .order('sort_order', { ascending: true })
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false });

      if (fetchError) throw fetchError;
      setResources(
        (data ?? []).map((row) =>
          normalizeResourceRow(row as Record<string, unknown>, resourceType),
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : labels.loadError;
      setError(message);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [labels.loadError, resourceType]);

  const editor = useFranchiseResourceEditor({
    config,
    onSaved: loadResources,
  });

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    void Promise.all([loadResources(), loadTaxonomies()]).catch((err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to load ${labels.plural} data.`,
      );
    });
  }, [isAdmin, labels.plural, loadResources, loadTaxonomies]);

  const taxonomyByKind = useMemo(() => {
    return {
      folder: taxonomies.filter((row) => row.kind === 'folder'),
      category: taxonomies.filter((row) => row.kind === 'category'),
      course: taxonomies.filter((row) => row.kind === 'course'),
      period: taxonomies.filter((row) => row.kind === 'period'),
    };
  }, [taxonomies]);

  const listFilterTaxonomyKind = config.listFilterTaxonomyKind ?? 'category';
  const listFilterTaxonomies = taxonomyByKind[listFilterTaxonomyKind];
  const listFilterLabel =
    listFilterTaxonomyKind === 'folder' ? 'Folder' : 'Category';

  const taxonomyLabelById = useMemo(() => {
    return new Map(taxonomies.map((row) => [row.id, row.label]));
  }, [taxonomies]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'id' ? 'desc' : 'asc');
  };

  const filteredResources = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = resources.filter((row) => {
      if (categoryFilter === 'none') {
        if (row.category_id != null) return false;
      } else if (categoryFilter !== 'all') {
        const categoryId = Number.parseInt(categoryFilter, 10);
        if (Number.isNaN(categoryId) || row.category_id !== categoryId) {
          return false;
        }
      }

      if (!term) return true;
      return (
        row.title.toLowerCase().includes(term) ||
        row.slug.toLowerCase().includes(term) ||
        (row.summary ?? '').toLowerCase().includes(term) ||
        (row.author_name ?? '').toLowerCase().includes(term) ||
        String(row.id).includes(term)
      );
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortColumn === 'id') return (a.id - b.id) * direction;
      return a[sortColumn].localeCompare(b[sortColumn]) * direction;
    });
  }, [categoryFilter, resources, search, sortColumn, sortDirection]);

  const {
    paginatedItems: paginatedResources,
    page,
    perPage,
    totalPages,
    totalRecords,
    perPageOptions,
    setPage,
    onPerPageChange,
  } = useTablePagination(filteredResources, `${search}|${categoryFilter}`);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('franchise_resources')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success(labels.deletedToast);
      setDeleteTarget(null);
      await loadResources();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : labels.deleteError,
      );
    } finally {
      setSaving(false);
    }
  };

  const filterId = `${resourceType}-category-filter`;

  if (profileLoading) {
    return (
      <DashboardLayout title={labels.pageTitle}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title={labels.pageTitle}>
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>{labels.adminRequiredDescription}</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={labels.pageTitle}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListIcon className="h-5 w-5" />
                {labels.listTitle}
              </CardTitle>
              <CardDescription>{labels.listDescription}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadResources()}
                disabled={loading}
              />
              <Button onClick={editor.openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                {labels.addButton}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Input
                placeholder={labels.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor={filterId} className="whitespace-nowrap">
                  {listFilterLabel}
                </Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger id={filterId} className="w-56">
                    <SelectValue placeholder={`All ${listFilterLabel.toLowerCase()}s`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {listFilterLabel.toLowerCase()}s</SelectItem>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {listFilterTaxonomies.map((taxonomy) => (
                      <SelectItem key={taxonomy.id} value={String(taxonomy.id)}>
                        {taxonomy.label}
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
            ) : filteredResources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {resources.length === 0 ? labels.emptyAll : labels.emptyFiltered}
              </p>
            ) : (
              <div className="space-y-4">
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
                          label="Title"
                          column="title"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Slug"
                          column="slug"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          {listFilterLabel}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Published
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedResources.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                            {row.id}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {row.title}
                            {row.is_mandatory ? (
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                Mandatory
                              </Badge>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {row.slug}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {row.category_id != null
                              ? taxonomyLabelById.get(row.category_id) ?? row.category_id
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {row.published_at
                              ? new Date(row.published_at).toLocaleString()
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={row.is_published ? 'default' : 'secondary'}
                            >
                              {row.is_published ? 'Published' : 'Draft'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => editor.openEdit(row)}
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
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  totalRecords={totalRecords}
                  page={page}
                  perPage={perPage}
                  totalPages={totalPages}
                  perPageOptions={perPageOptions}
                  onPageChange={setPage}
                  onPerPageChange={onPerPageChange}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FranchiseResourceEditorDialog
        config={config}
        open={editor.dialogOpen}
        onOpenChange={editor.setDialogOpen}
        editingId={editor.editingId}
        form={editor.form}
        setForm={editor.setForm}
        thumbnailPreviewUrl={editor.thumbnailPreviewUrl}
        editorTab={editor.editorTab}
        onEditorTabChange={editor.setEditorTab}
        saving={editor.saving}
        isUploading={editor.isUploading}
        taxonomyByKind={taxonomyByKind}
        idPrefix={resourceType}
        onTitleChange={editor.handleTitleChange}
        onThumbnailUpload={editor.handleThumbnailUpload}
        onThumbnailClear={editor.handleThumbnailClear}
        onContentFileUpload={editor.handleContentFileUpload}
        onVideoFileUpload={editor.handleVideoFileUpload}
        onAttachmentUpload={editor.handleAttachmentUpload}
        onRemoveAttachment={editor.removeAttachment}
        onContentChange={editor.handleContentChange}
        onAssetUploaded={editor.handleAssetUploaded}
        onReferenceChange={editor.handleReferenceChange}
        onSave={() => void editor.handleSave()}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.title}</strong>{' '}
              {labels.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving || editor.saving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving || editor.saving}
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
