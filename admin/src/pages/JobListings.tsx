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
import { RefreshTableButton } from '@/components/ui/refresh-table-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  formatJobListingDate,
  JOB_LISTING_SELECT,
  jobListingActiveBadgeClass,
} from '@/lib/job-listings';
import supabase from '@/lib/supabase/client';
import {
  emptyJobListingInput,
  jobListingToInput,
  linesToTextArray,
  textArrayToLines,
  type JobListing,
  type JobListingInput,
} from '@/types/JobListing';
import { Briefcase, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type StoreLocationOption = {
  id: number;
  name: string;
};

type ActiveFilter = 'all' | 'active' | 'inactive';

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateForm(form: JobListingInput): string | null {
  if (!form.title.trim()) return 'Title is required.';
  if (!form.department.trim()) return 'Department is required.';
  if (!form.employment_type.trim()) return 'Employment type is required.';
  if (!form.location.trim()) return 'Location is required.';
  if (!form.salary.trim()) return 'Salary is required.';
  if (!form.summary.trim()) return 'Summary is required.';
  return null;
}

function toPayload(form: JobListingInput): JobListingInput {
  return {
    title: form.title.trim(),
    department: form.department.trim(),
    employment_type: form.employment_type.trim(),
    location: form.location.trim(),
    salary: form.salary.trim(),
    badge: nullable(form.badge ?? ''),
    badge_color: form.badge_color.trim(),
    summary: form.summary.trim(),
    responsibilities: form.responsibilities,
    requirements: form.requirements,
    perks: form.perks,
    is_active: form.is_active,
    sort_order: form.sort_order,
    store_id: form.store_id,
  };
}

export function JobListings() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [rows, setRows] = useState<JobListing[]>([]);
  const [storeLocations, setStoreLocations] = useState<StoreLocationOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<JobListingInput>(emptyJobListingInput());
  const [responsibilitiesText, setResponsibilitiesText] = useState('');
  const [requirementsText, setRequirementsText] = useState('');
  const [perksText, setPerksText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<JobListing | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const selectAllRef = useRef<HTMLInputElement>(null);

  const departments = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.department))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (activeFilter === 'active' && !row.is_active) return false;
      if (activeFilter === 'inactive' && row.is_active) return false;
      if (departmentFilter !== 'all' && row.department !== departmentFilter) {
        return false;
      }
      if (!term) return true;
      return (
        row.title.toLowerCase().includes(term) ||
        row.department.toLowerCase().includes(term) ||
        row.location.toLowerCase().includes(term) ||
        row.salary.toLowerCase().includes(term) ||
        (row.badge ?? '').toLowerCase().includes(term)
      );
    });
  }, [rows, activeFilter, departmentFilter, search]);

  const selectedCount = selectedIds.size;

  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedIds.has(row.id));

  const someFilteredSelected =
    filteredRows.some((row) => selectedIds.has(row.id)) && !allFilteredSelected;

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_listings')
        .select(JOB_LISTING_SELECT)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      setRows((data ?? []) as JobListing[]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load job listings.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStoreLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('store_locations')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setStoreLocations((data ?? []) as StoreLocationOption[]);
    } catch {
      setStoreLocations([]);
    }
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    if (!profileLoading && isAdmin) {
      void loadRows();
      void loadStoreLocations();
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [isAdmin, profileLoading, loadRows, loadStoreLocations]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected, filteredRows.length]);

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of filteredRows) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  };

  const resetListFields = (listing: JobListingInput) => {
    setResponsibilitiesText(textArrayToLines(listing.responsibilities));
    setRequirementsText(textArrayToLines(listing.requirements));
    setPerksText(textArrayToLines(listing.perks));
  };

  const openCreate = () => {
    const input = emptyJobListingInput();
    const nextSort =
      rows.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;
    setEditingId(null);
    setForm({ ...input, sort_order: nextSort });
    resetListFields(input);
    setDialogOpen(true);
  };

  const openEdit = (row: JobListing) => {
    const input = jobListingToInput(row);
    setEditingId(row.id);
    setForm(input);
    resetListFields(input);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payloadInput: JobListingInput = {
      ...form,
      responsibilities: linesToTextArray(responsibilitiesText),
      requirements: linesToTextArray(requirementsText),
      perks: linesToTextArray(perksText),
    };

    const validation = validateForm(payloadInput);
    if (validation) {
      toast.error(validation);
      return;
    }

    const payload = toPayload(payloadInput);
    setSaving(true);
    try {
      if (editingId !== null) {
        const { error } = await supabase
          .from('job_listings')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Job listing updated.');
      } else {
        const { error } = await supabase.from('job_listings').insert(payload);
        if (error) throw error;
        toast.success('Job listing created.');
      }
      setDialogOpen(false);
      await loadRows();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save job listing.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('job_listings')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Job listing deleted.');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
      await loadRows();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete job listing.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('job_listings').delete().in('id', ids);
      if (error) throw error;
      toast.success(
        `Deleted ${ids.length} ${ids.length === 1 ? 'listing' : 'listings'}.`,
      );
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await loadRows();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete listings.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggleActive = async (row: JobListing) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('job_listings')
        .update({ is_active: !row.is_active })
        .eq('id', row.id);
      if (error) throw error;
      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, is_active: !row.is_active } : item,
        ),
      );
      toast.success(row.is_active ? 'Listing hidden.' : 'Listing published.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update listing.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Job Listings">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Listings
            </CardTitle>
            <CardDescription>
              Manage careers page postings stored in <code>job_listings</code>.
            </CardDescription>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadRows()}
                disabled={loading}
              />
              <Button type="button" size="sm" onClick={openCreate} disabled={loading}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {profileLoading || loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading…
            </div>
          ) : !isAdmin ? (
            <p className="text-muted-foreground">
              Administrator access is required to manage job listings.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">No job listings found.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="job-listing-search">Search</Label>
                  <Input
                    id="job-listing-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Title, department, location…"
                    className="w-56"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="job-listing-active-filter">Status</Label>
                  <Select
                    value={activeFilter}
                    onValueChange={(value) =>
                      setActiveFilter(value as ActiveFilter)
                    }
                  >
                    <SelectTrigger id="job-listing-active-filter" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="job-listing-department-filter">Department</Label>
                  <Select
                    value={departmentFilter}
                    onValueChange={setDepartmentFilter}
                  >
                    <SelectTrigger
                      id="job-listing-department-filter"
                      className="w-44"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department} value={department}>
                          {department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCount > 0 ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="ml-auto shrink-0"
                    onClick={() => setBulkDeleteOpen(true)}
                    disabled={saving}
                  >
                    <Trash2 className="size-4" />
                    Delete {selectedCount}{' '}
                    {selectedCount === 1 ? 'item' : 'items'}
                  </Button>
                ) : null}
              </div>

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 px-3 py-2">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={allFilteredSelected}
                          disabled={saving || filteredRows.length === 0}
                          aria-label="Select all visible listings"
                          onChange={(event) =>
                            toggleSelectAllFiltered(event.target.checked)
                          }
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        ID
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Title
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Department
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Location
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Salary
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Badge
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Order
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Updated
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-3 py-8 text-center text-sm text-muted-foreground"
                        >
                          No listings match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr
                          key={row.id}
                          className={`border-b transition-colors hover:bg-muted/50 ${
                            selectedIds.has(row.id) ? 'bg-muted/30' : ''
                          }`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input"
                              checked={selectedIds.has(row.id)}
                              disabled={saving}
                              aria-label={`Select listing ${row.id}`}
                              onChange={(event) =>
                                toggleSelected(row.id, event.target.checked)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-sm">{row.id}</td>
                          <td className="px-3 py-2 text-sm font-medium">
                            {row.title}
                          </td>
                          <td className="px-3 py-2 text-sm text-muted-foreground">
                            {row.department}
                          </td>
                          <td className="px-3 py-2 text-sm text-muted-foreground">
                            {row.employment_type}
                          </td>
                          <td className="px-3 py-2 text-sm text-muted-foreground">
                            {row.location}
                          </td>
                          <td className="px-3 py-2 text-sm text-muted-foreground">
                            {row.salary}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {row.badge ? (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ${row.badge_color || 'bg-primary'}`}
                              >
                                {row.badge}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-sm">
                            {row.sort_order}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <Badge
                              variant="secondary"
                              className={jobListingActiveBadgeClass(row.is_active)}
                            >
                              {row.is_active ? 'active' : 'inactive'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {formatJobListingDate(row.updated_at)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => void handleQuickToggleActive(row)}
                                disabled={saving}
                              >
                                {row.is_active ? 'Hide' : 'Publish'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                onClick={() => openEdit(row)}
                                disabled={saving}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                onClick={() => setDeleteTarget(row)}
                                disabled={saving}
                              >
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit job listing' : 'Add job listing'}
            </DialogTitle>
            <DialogDescription>
              Fields map to the public careers page job cards.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="jl-title">Title</Label>
              <Input
                id="jl-title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jl-department">Department</Label>
              <Input
                id="jl-department"
                value={form.department}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    department: event.target.value,
                  }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jl-employment-type">Employment type</Label>
              <Input
                id="jl-employment-type"
                value={form.employment_type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    employment_type: event.target.value,
                  }))
                }
                disabled={saving}
                placeholder="Full-Time"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jl-location">Location</Label>
              <Input
                id="jl-location"
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jl-salary">Salary</Label>
              <Input
                id="jl-salary"
                value={form.salary}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, salary: event.target.value }))
                }
                disabled={saving}
                placeholder="$24 – $30/hr + super"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jl-badge">Badge</Label>
              <Input
                id="jl-badge"
                value={form.badge ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    badge: event.target.value || null,
                  }))
                }
                disabled={saving}
                placeholder="NOW HIRING"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jl-badge-color">Badge color class</Label>
              <Input
                id="jl-badge-color"
                value={form.badge_color}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    badge_color: event.target.value,
                  }))
                }
                disabled={saving}
                placeholder="bg-primary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jl-sort-order">Sort order</Label>
              <Input
                id="jl-sort-order"
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sort_order: Number(event.target.value) || 0,
                  }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jl-store">Store (optional)</Label>
              <Select
                value={form.store_id ? String(form.store_id) : 'none'}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    store_id: value === 'none' ? null : Number(value),
                  }))
                }
                disabled={saving}
              >
                <SelectTrigger id="jl-store">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {storeLocations.map((store) => (
                    <SelectItem key={store.id} value={String(store.id)}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="jl-active"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: event.target.checked,
                  }))
                }
                disabled={saving}
              />
              <Label htmlFor="jl-active">Active on careers page</Label>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="jl-summary">Summary</Label>
              <Textarea
                id="jl-summary"
                value={form.summary}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, summary: event.target.value }))
                }
                disabled={saving}
                rows={4}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="jl-responsibilities">
                Responsibilities (one per line)
              </Label>
              <Textarea
                id="jl-responsibilities"
                value={responsibilitiesText}
                onChange={(event) => setResponsibilitiesText(event.target.value)}
                disabled={saving}
                rows={6}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="jl-requirements">
                Requirements (one per line)
              </Label>
              <Textarea
                id="jl-requirements"
                value={requirementsText}
                onChange={(event) => setRequirementsText(event.target.value)}
                disabled={saving}
                rows={6}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="jl-perks">Perks (one per line)</Label>
              <Textarea
                id="jl-perks"
                value={perksText}
                onChange={(event) => setPerksText(event.target.value)}
                disabled={saving}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
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
            <AlertDialogTitle>Delete job listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes &quot;{deleteTarget?.title}&quot; (#
              {deleteTarget?.id}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount}{' '}
              {selectedCount === 1 ? 'listing' : 'listings'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleBulkDelete();
              }}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
