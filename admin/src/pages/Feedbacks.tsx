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
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import {
  emptyFeedbackInput,
  feedbackToInput,
  type Feedback,
  type FeedbackInput,
} from '@/types/Feedback';
import { Eye, Loader2, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

function truncate(text: string, max = 80): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
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

  const loadFeedbacks = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

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
      const payload = {
        name: form.name.trim(),
        email: form.email?.trim() || null,
        question: form.question.trim(),
        source: form.source,
        ip_hash: form.ip_hash.trim(),
        created_at: form.created_at,
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
            <Button onClick={openCreate} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add feedback
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : feedbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No feedback submissions yet.
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
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Question
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Submitted
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbacks.map((feedback) => (
                      <tr
                        key={feedback.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
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
                          {truncate(feedback.question)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{feedback.source}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(feedback.created_at).toLocaleString()}
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
                <Label htmlFor="feedback-source">Source</Label>
                <Input id="feedback-source" value={form.source} disabled />
              </div>
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

      <Dialog
        open={viewTarget !== null}
        onOpenChange={(open) => !open && setViewTarget(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Feedback #{viewTarget?.id}</DialogTitle>
            <DialogDescription>
              Submitted{' '}
              {viewTarget
                ? new Date(viewTarget.created_at).toLocaleString()
                : ''}
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Name</p>
                <p>{viewTarget.name}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Email</p>
                <p>{viewTarget.email ?? '—'}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Source</p>
                <Badge variant="secondary">{viewTarget.source}</Badge>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Question</p>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {viewTarget.question}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">IP hash</p>
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {viewTarget.ip_hash}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Close
            </Button>
            {viewTarget && (
              <Button
                onClick={() => {
                  openEdit(viewTarget);
                  setViewTarget(null);
                }}
              >
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
