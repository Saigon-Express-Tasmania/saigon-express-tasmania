import { FeedbackViewDialog } from '@/components/feedbacks/FeedbackViewDialog';
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
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  statusBadgeVariant,
  truncateFeedbackText,
  updateFeedbackStatus,
} from '@/lib/feedbacks';
import supabase from '@/lib/supabase/client';
import {
  emptyFeedbackInput,
  FEEDBACK_STATUS_OPTIONS,
  feedbackToInput,
  type Feedback,
  type FeedbackInput,
  type FeedbackStatus,
} from '@/types/Feedback';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type SortColumn = 'id' | 'name' | 'email' | 'created_at' | 'resolved_at';
type SortDirection = 'asc' | 'desc';

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

function compareNullableString(
  a: string | null,
  b: string | null,
  direction: number,
): number {
  const aVal = a ?? '';
  const bVal = b ?? '';
  if (!aVal && !bVal) return 0;
  if (!aVal) return 1;
  if (!bVal) return -1;
  return aVal.localeCompare(bVal) * direction;
}

function compareNullableDate(
  a: string | null,
  b: string | null,
  direction: number,
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return (new Date(a).getTime() - new Date(b).getTime()) * direction;
}

function validateFeedbackForm(form: FeedbackInput): string | null {
  const name = form.name.trim();
  const question = form.question.trim();
  const email = form.email?.trim() ?? '';

  if (name.length < 1 || name.length > 128) {
    return 'Name must be between 1 and 128 characters.';
  }
  if (question.length < 10 || question.length > 1000) {
    return 'Question must be between 10 and 1000 characters.';
  }
  if (email.length > 320) {
    return 'Email must be at most 320 characters.';
  }
  if (!form.ip_hash.trim()) {
    return 'IP hash is required.';
  }
  return null;
}

export function Feedbacks() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FeedbackInput>(emptyFeedbackInput());

  const [viewTarget, setViewTarget] = useState<Feedback | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const selectAllRef = useRef<HTMLInputElement>(null);

  const loadFeedbacks = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('feedbacks')
        .select('*');

      if (fetchError) throw fetchError;
      setFeedbacks((data ?? []) as Feedback[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load feedback.';
      setError(message);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadFeedbacks();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadFeedbacks]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'id' || column === 'created_at' ? 'desc' : 'asc');
  };

  const filteredFeedbacks = useMemo(() => {
    const filtered =
      statusFilter === 'all'
        ? feedbacks
        : feedbacks.filter((feedback) => feedback.status === statusFilter);

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortColumn) {
        case 'id':
          return (a.id - b.id) * direction;
        case 'name':
          return a.name.localeCompare(b.name) * direction;
        case 'email':
          return compareNullableString(a.email, b.email, direction);
        case 'created_at':
          return compareNullableDate(a.created_at, b.created_at, direction);
        case 'resolved_at':
          return compareNullableDate(a.resolved_at, b.resolved_at, direction);
      }
    });
  }, [feedbacks, statusFilter, sortColumn, sortDirection]);

  const selectedCount = selectedIds.size;

  const allFilteredSelected =
    filteredFeedbacks.length > 0 &&
    filteredFeedbacks.every((feedback) => selectedIds.has(feedback.id));

  const someFilteredSelected =
    filteredFeedbacks.some((feedback) => selectedIds.has(feedback.id)) &&
    !allFilteredSelected;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected, filteredFeedbacks.length]);

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    if (!checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const feedback of filteredFeedbacks) {
          next.delete(feedback.id);
        }
        return next;
      });
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const feedback of filteredFeedbacks) {
        next.add(feedback.id);
      }
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyFeedbackInput());
    setDialogOpen(true);
  };

  const openEdit = (feedback: Feedback) => {
    setEditingId(feedback.id);
    setForm(feedbackToInput(feedback));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const validationError = validateFeedbackForm(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const resolvedAt =
        form.status === 'resolved'
          ? form.resolved_at ?? new Date().toISOString()
          : null;

      const payload = {
        name: form.name.trim(),
        email: form.email?.trim() || null,
        question: form.question.trim(),
        source: form.source,
        ip_hash: form.ip_hash.trim(),
        status: form.status,
        created_at: form.created_at,
        resolved_at: resolvedAt,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('feedbacks')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Feedback updated.');
      } else {
        const { error: insertError } = await supabase
          .from('feedbacks')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Feedback created.');
      }

      setDialogOpen(false);
      await loadFeedbacks();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save feedback.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    feedback: Feedback,
    status: FeedbackStatus,
  ) => {
    setSaving(true);
    try {
      const updated = await updateFeedbackStatus(feedback.id, status);
      setFeedbacks((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setViewTarget((prev) => (prev?.id === updated.id ? updated : prev));
      toast.success(`Feedback marked as ${status}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update status.',
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
        .from('feedbacks')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Feedback deleted.');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
      await loadFeedbacks();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete feedback.',
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
      const { error: deleteError } = await supabase
        .from('feedbacks')
        .delete()
        .in('id', ids);

      if (deleteError) throw deleteError;
      toast.success(
        `Deleted ${ids.length} ${ids.length === 1 ? 'feedback' : 'feedbacks'}.`,
      );
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await loadFeedbacks();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete feedback.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Feedbacks">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Feedbacks">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage feedback submissions.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Feedbacks">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Feedbacks
              </CardTitle>
              <CardDescription>
                FAQ questions and feedback submitted from the public website.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadFeedbacks()}
                disabled={loading}
              />
              <Button onClick={openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add feedback
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="feedback-status-filter" className="whitespace-nowrap">
                  Status
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger id="feedback-status-filter" className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {FEEDBACK_STATUS_OPTIONS.map((status) => (
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
                  className="shrink-0 self-end sm:self-auto"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={saving}
                >
                  <Trash2 className="size-4" />
                  Delete {selectedCount}{' '}
                  {selectedCount === 1 ? 'item' : 'items'}
                </Button>
              ) : null}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFeedbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {feedbacks.length === 0
                  ? 'No feedback submissions yet.'
                  : 'No feedback matches the selected status.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 px-4 py-3">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={allFilteredSelected}
                          disabled={saving || filteredFeedbacks.length === 0}
                          aria-label="Select all visible feedback"
                          onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
                        />
                      </th>
                      <SortableHeader
                        label="ID"
                        column="id"
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
                      <SortableHeader
                        label="Email"
                        column="email"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Question
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Status
                      </th>
                      <SortableHeader
                        label="Submitted"
                        column="created_at"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Resolved at"
                        column="resolved_at"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeedbacks.map((feedback) => (
                      <tr
                        key={feedback.id}
                        className={`border-b transition-colors hover:bg-muted/50 ${
                          selectedIds.has(feedback.id) ? 'bg-muted/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={selectedIds.has(feedback.id)}
                            disabled={saving}
                            aria-label={`Select feedback ${feedback.id}`}
                            onChange={(e) =>
                              toggleSelected(feedback.id, e.target.checked)
                            }
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">
                          {feedback.id}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {feedback.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {feedback.email ?? '—'}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-sm text-muted-foreground">
                          {truncateFeedbackText(feedback.question)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{feedback.source}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadgeVariant(feedback.status)}>
                            {feedback.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(feedback.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {feedback.resolved_at
                            ? new Date(feedback.resolved_at).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewTarget(feedback)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(feedback)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(feedback)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit feedback' : 'Add feedback'}
            </DialogTitle>
            <DialogDescription>
              {editingId !== null
                ? 'Update a feedback record from the public FAQ form.'
                : 'Manually create a feedback record (e.g. from phone or email).'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="feedback-name">Name</Label>
              <Input
                id="feedback-name"
                value={form.name}
                maxLength={128}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feedback-email">Email</Label>
              <Input
                id="feedback-email"
                type="email"
                value={form.email ?? ''}
                maxLength={320}
                placeholder="Optional"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    email: e.target.value || null,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feedback-question">Question</Label>
              <Textarea
                id="feedback-question"
                rows={5}
                maxLength={1000}
                value={form.question}
                onChange={(e) =>
                  setForm((f) => ({ ...f, question: e.target.value }))
                }
              />
              <p className="text-right text-xs text-muted-foreground">
                {form.question.length}/1000
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="feedback-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((f) => ({
                      ...f,
                      status: value as FeedbackStatus,
                      resolved_at:
                        value === 'resolved'
                          ? f.resolved_at ?? new Date().toISOString()
                          : null,
                    }))
                  }
                >
                  <SelectTrigger id="feedback-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="feedback-source">Source</Label>
                <Input id="feedback-source" value={form.source} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="feedback-created-at">Submitted at</Label>
                <Input
                  id="feedback-created-at"
                  type="datetime-local"
                  value={form.created_at.slice(0, 16)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({
                      ...f,
                      created_at: value
                        ? new Date(value).toISOString()
                        : f.created_at,
                    }));
                  }}
                />
              </div>
              {form.status === 'resolved' && form.resolved_at && (
                <div className="grid gap-2">
                  <Label htmlFor="feedback-resolved-at">Resolved at</Label>
                  <Input
                    id="feedback-resolved-at"
                    value={new Date(form.resolved_at).toLocaleString()}
                    readOnly
                  />
                </div>
              )}
            </div>
            {editingId !== null && (
              <div className="grid gap-2">
                <Label htmlFor="feedback-ip-hash">IP hash</Label>
                <Input
                  id="feedback-ip-hash"
                  value={form.ip_hash}
                  readOnly
                  className="font-mono text-xs"
                />
              </div>
            )}
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

      <FeedbackViewDialog
        feedback={viewTarget}
        open={viewTarget !== null}
        saving={saving}
        onOpenChange={(open) => !open && setViewTarget(null)}
        onStatusChange={(feedback, status) =>
          void handleStatusChange(feedback, status)
        }
        onEdit={openEdit}
      />

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} {selectedCount === 1 ? 'feedback' : 'feedbacks'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {selectedCount}{' '}
              {selectedCount === 1 ? 'submission' : 'submissions'} from{' '}
              <code>feedbacks</code>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDelete();
              }}
            >
              {saving ? 'Deleting…' : `Delete ${selectedCount} items`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the submission from{' '}
              <strong>{deleteTarget?.name}</strong>. This cannot be undone.
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
