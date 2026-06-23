import { JobApplicationViewDialog } from '@/components/job-applications/JobApplicationViewDialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  buildApplicantName,
  formatJobApplicationDate,
  JOB_APPLICATION_SELECT,
  jobApplicationStatusBadgeClass,
  jobApplicationStatusButtonClass,
  updateJobApplicationStatus,
} from '@/lib/job-applications';
import supabase from '@/lib/supabase/client';
import {
  emptyJobApplicationInput,
  JOB_APPLICATION_STATUS_OPTIONS,
  jobApplicationToInput,
  type JobApplication,
  type JobApplicationInput,
  type JobApplicationStatus,
} from '@/types/JobApplication';
import {
  Briefcase,
  CircleCheckBig,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateForm(form: JobApplicationInput): string | null {
  if (!form.job_title.trim()) return 'Job title is required.';
  if (!form.legal_first_name.trim()) return 'First name is required.';
  if (!form.legal_last_name.trim()) return 'Last name is required.';
  if (!form.email.trim()) return 'Email is required.';
  if (!form.agree_to_terms) return 'Agree to terms must be checked.';
  return null;
}

function toPayload(form: JobApplicationInput): JobApplicationInput {
  return {
    job_title: form.job_title.trim(),
    job_location: nullable(form.job_location ?? ''),
    store_id: form.store_id,
    legal_first_name: form.legal_first_name.trim(),
    legal_middle_names: nullable(form.legal_middle_names ?? ''),
    legal_last_name: form.legal_last_name.trim(),
    email: form.email.trim(),
    phone: nullable(form.phone ?? ''),
    resume_url: nullable(form.resume_url ?? ''),
    resume_filename: nullable(form.resume_filename ?? ''),
    cover_letter_url: nullable(form.cover_letter_url ?? ''),
    cover_letter_filename: nullable(form.cover_letter_filename ?? ''),
    agree_to_terms: form.agree_to_terms,
    date_of_birth: form.date_of_birth || null,
    can_work_weekends: nullable(form.can_work_weekends ?? ''),
    commute_under_20_minutes: nullable(form.commute_under_20_minutes ?? ''),
    work_availability: nullable(form.work_availability ?? ''),
    candidate_message: nullable(form.candidate_message ?? ''),
    status: form.status,
  };
}

export default function JobApplications() {
  const { applicationId: applicationIdParam } = useParams<{
    applicationId?: string;
  }>();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [rows, setRows] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<JobApplicationInput>(emptyJobApplicationInput());
  const [viewTarget, setViewTarget] = useState<JobApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | JobApplicationStatus>(
    'all',
  );
  const selectAllRef = useRef<HTMLInputElement>(null);
  const deepLinkHandledRef = useRef(false);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        statusFilter === 'all' ? true : row.status === statusFilter,
      ),
    [rows, statusFilter],
  );

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
        .from('job_applications')
        .select(JOB_APPLICATION_SELECT)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRows((data ?? []) as JobApplication[]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load job applications.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    if (!profileLoading && isAdmin) {
      void loadRows();
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [isAdmin, profileLoading, loadRows]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected, filteredRows.length]);

  useEffect(() => {
    if (deepLinkHandledRef.current || loading || !applicationIdParam) return;
    const id = Number(applicationIdParam);
    if (!Number.isFinite(id)) return;

    const match = rows.find((row) => row.id === id);
    if (match) {
      setViewTarget(match);
      deepLinkHandledRef.current = true;
      return;
    }

    if (!loading && rows.length >= 0) {
      void (async () => {
        try {
          const { data, error } = await supabase
            .from('job_applications')
            .select(JOB_APPLICATION_SELECT)
            .eq('id', id)
            .maybeSingle();
          if (error) throw error;
          if (data) {
            setViewTarget(data as JobApplication);
          } else {
            toast.error(`Job application #${id} not found.`);
          }
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : 'Failed to load job application.',
          );
        } finally {
          deepLinkHandledRef.current = true;
        }
      })();
    }
  }, [applicationIdParam, loading, rows]);

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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyJobApplicationInput());
    setDialogOpen(true);
  };

  const openEdit = (row: JobApplication) => {
    setEditingId(row.id);
    setForm(jobApplicationToInput(row));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const validation = validateForm(form);
    if (validation) {
      toast.error(validation);
      return;
    }

    const payload = toPayload(form);
    setSaving(true);
    try {
      if (editingId !== null) {
        const { error } = await supabase
          .from('job_applications')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Application updated.');
      } else {
        const { error } = await supabase.from('job_applications').insert(payload);
        if (error) throw error;
        toast.success('Application created.');
      }
      setDialogOpen(false);
      await loadRows();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save application.',
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
        .from('job_applications')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Application deleted.');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      if (viewTarget?.id === deleteTarget.id) setViewTarget(null);
      setDeleteTarget(null);
      await loadRows();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete application.',
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
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .in('id', ids);
      if (error) throw error;
      toast.success(
        `Deleted ${ids.length} ${ids.length === 1 ? 'application' : 'applications'}.`,
      );
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      if (viewTarget && ids.includes(viewTarget.id)) setViewTarget(null);
      await loadRows();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete applications.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusUpdate = async (
    row: JobApplication,
    status: JobApplicationStatus,
  ) => {
    if (row.status === status) return;
    setSaving(true);
    try {
      const updated = await updateJobApplicationStatus(row.id, status);
      setRows((prev) =>
        prev.map((item) => (item.id === row.id ? updated : item)),
      );
      setViewTarget((prev) => (prev?.id === updated.id ? updated : prev));
      toast.success(`Status updated to ${status}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update status.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Job Applications">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Applications
            </CardTitle>
            <CardDescription>
              Manage careers form submissions stored in{' '}
              <code>job_applications</code>.
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
              Administrator access is required to manage job applications.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">No applications found.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Label
                    htmlFor="job-application-status-filter"
                    className="whitespace-nowrap"
                  >
                    Status
                  </Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(value as 'all' | JobApplicationStatus)
                    }
                  >
                    <SelectTrigger
                      id="job-application-status-filter"
                      className="w-44"
                    >
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {JOB_APPLICATION_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
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
                    className="shrink-0"
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
                          aria-label="Select all visible applications"
                          onChange={(e) =>
                            toggleSelectAllFiltered(e.target.checked)
                          }
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        ID
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Applicant
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Role
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Location
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">
                        Submitted
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
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
                            aria-label={`Select application ${row.id}`}
                            onChange={(e) =>
                              toggleSelected(row.id, e.target.checked)
                            }
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-sm">{row.id}</td>
                        <td className="px-3 py-2 text-sm font-medium">
                          {buildApplicantName(row)}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {row.email}
                        </td>
                        <td className="px-3 py-2 text-sm">{row.job_title}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {row.job_location ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <Badge
                            variant="secondary"
                            className={jobApplicationStatusBadgeClass(row.status)}
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {formatJobApplicationDate(row.created_at)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => setViewTarget(row)}
                              disabled={saving}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  disabled={saving}
                                >
                                  <CircleCheckBig className="size-3.5" />
                                  Status
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                {JOB_APPLICATION_STATUS_OPTIONS.map((status) => (
                                  <DropdownMenuItem
                                    key={status}
                                    className={jobApplicationStatusButtonClass(
                                      status,
                                    )}
                                    onClick={() =>
                                      void handleQuickStatusUpdate(row, status)
                                    }
                                    disabled={row.status === status || saving}
                                  >
                                    {status}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <JobApplicationViewDialog
        application={viewTarget}
        open={viewTarget !== null}
        saving={saving}
        onOpenChange={(open) => !open && setViewTarget(null)}
        onStatusChange={(application, status) =>
          void handleQuickStatusUpdate(application, status)
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit application' : 'Add application'}
            </DialogTitle>
            <DialogDescription>
              Manage fields for a job application record.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="ja-job-title">Job title</Label>
              <Input
                id="ja-job-title"
                value={form.job_title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, job_title: e.target.value }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-job-location">Location</Label>
              <Input
                id="ja-job-location"
                value={form.job_location ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, job_location: e.target.value || null }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    status: value as JobApplicationStatus,
                  }))
                }
                disabled={saving}
              >
                <SelectTrigger id="ja-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_APPLICATION_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-first-name">First name</Label>
              <Input
                id="ja-first-name"
                value={form.legal_first_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, legal_first_name: e.target.value }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-middle-names">Middle name(s)</Label>
              <Input
                id="ja-middle-names"
                value={form.legal_middle_names ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    legal_middle_names: e.target.value || null,
                  }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-last-name">Last name</Label>
              <Input
                id="ja-last-name"
                value={form.legal_last_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, legal_last_name: e.target.value }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-email">Email</Label>
              <Input
                id="ja-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-phone">Phone</Label>
              <Input
                id="ja-phone"
                value={form.phone ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value || null }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-dob">Date of birth</Label>
              <Input
                id="ja-dob"
                type="date"
                value={form.date_of_birth ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    date_of_birth: e.target.value || null,
                  }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-weekends">Can work weekends?</Label>
              <Select
                value={form.can_work_weekends ?? 'none'}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    can_work_weekends: value === 'none' ? null : value,
                  }))
                }
                disabled={saving}
              >
                <SelectTrigger id="ja-weekends">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-commute">Commute under 20 min?</Label>
              <Select
                value={form.commute_under_20_minutes ?? 'none'}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    commute_under_20_minutes: value === 'none' ? null : value,
                  }))
                }
                disabled={saving}
              >
                <SelectTrigger id="ja-commute">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="ja-availability">Work availability</Label>
              <Textarea
                id="ja-availability"
                value={form.work_availability ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    work_availability: e.target.value || null,
                  }))
                }
                disabled={saving}
                rows={3}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="ja-message">Candidate message</Label>
              <Textarea
                id="ja-message"
                value={form.candidate_message ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    candidate_message: e.target.value || null,
                  }))
                }
                disabled={saving}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-resume-url">Resume URL</Label>
              <Input
                id="ja-resume-url"
                value={form.resume_url ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, resume_url: e.target.value || null }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-resume-filename">Resume filename</Label>
              <Input
                id="ja-resume-filename"
                value={form.resume_filename ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    resume_filename: e.target.value || null,
                  }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-cover-url">Cover letter URL</Label>
              <Input
                id="ja-cover-url"
                value={form.cover_letter_url ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cover_letter_url: e.target.value || null,
                  }))
                }
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ja-cover-filename">Cover letter filename</Label>
              <Input
                id="ja-cover-filename"
                value={form.cover_letter_filename ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cover_letter_filename: e.target.value || null,
                  }))
                }
                disabled={saving}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="ja-agree"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.agree_to_terms}
                onChange={(e) =>
                  setForm((f) => ({ ...f, agree_to_terms: e.target.checked }))
                }
                disabled={saving}
              />
              <Label htmlFor="ja-agree">Agreed to terms</Label>
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
            <AlertDialogTitle>Delete application?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes application #{deleteTarget?.id} for{' '}
              {deleteTarget ? buildApplicantName(deleteTarget) : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
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
              {selectedCount === 1 ? 'application' : 'applications'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
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
