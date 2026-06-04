import { EmailTemplateReferencesDialog } from '@/components/EmailTemplateReferencesDialog';
import { EmailTemplateTestDataDialog } from '@/components/EmailTemplateTestDataDialog';
import { SendEmailDialog } from '@/components/SendEmailDialog';
import { TemplateExtensionsEditor } from '@/components/TemplateExtensionsEditor';
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
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  EMAIL_TEMPLATE_BATCH_MAX,
  invokeEmailTemplateEdge,
  invokeEmailTemplateEdgeBatch,
} from '@/lib/email-template-api';
import { extractTemplateVariables } from '@/lib/email-template-preview';
import { formatHtmlFields } from '@/lib/format-html';
import supabase from '@/lib/supabase/client';
import {
  emptyEmailTemplateInput,
  normalizeEmailTemplateReference,
  normalizeStringArray,
  SES_TEMPLATE_NAME_PATTERN,
  normalizeTestData,
  testDataForSave,
  trimStringArray,
  type EmailTemplate,
  type EmailTemplateInput,
  type EmailTemplateTestData,
} from '@/types/EmailTemplate';
import { CloudUpload, ImageIcon, Loader2, Mail, Pencil, Plus, Sparkles, TestTube2Icon, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function templateToInput(row: EmailTemplate): EmailTemplateInput {
  return {
    name: row.name,
    subject: row.subject,
    html_body: row.html_body,
    html_extensions: normalizeStringArray(row.html_extensions),
    text_body: row.text_body ?? '',
    text_extensions: normalizeStringArray(row.text_extensions),
    reference: normalizeEmailTemplateReference(row.reference),
  };
}

function buildPersistPayload(
  form: EmailTemplateInput,
  testData: EmailTemplateTestData,
) {
  return {
    name: form.name.trim(),
    subject: form.subject.trim(),
    html_body: form.html_body.trim(),
    html_extensions: trimStringArray(form.html_extensions),
    text_body: form.text_body.trim() || null,
    text_extensions: trimStringArray(form.text_extensions),
    reference: form.reference,
    test_data: testDataForSave(testData),
  };
}

function snapshotDialogState(
  form: EmailTemplateInput,
  testData: EmailTemplateTestData,
): string {
  return JSON.stringify(buildPersistPayload(form, testData));
}

function validateForm(form: EmailTemplateInput): string | null {
  const name = form.name.trim();
  if (!name) return 'Template name is required.';
  if (!SES_TEMPLATE_NAME_PATTERN.test(name)) {
    return 'Name may only contain letters, numbers, underscores, and hyphens (AWS SES).';
  }
  if (!form.subject.trim()) return 'Subject is required.';
  if (!form.html_body.trim()) return 'HTML body is required.';
  return null;
}

export function Emails() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogSyncing, setDialogSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [batchSyncing, setBatchSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [bodyEditorTab, setBodyEditorTab] = useState<'html' | 'text'>('html');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmailTemplateInput>(emptyEmailTemplateInput());
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [referencesDialogOpen, setReferencesDialogOpen] = useState(false);
  const [testDataDialogOpen, setTestDataDialogOpen] = useState(false);
  const [testTemplateData, setTestTemplateData] = useState<EmailTemplateTestData>(
    {},
  );
  const [dialogBaseline, setDialogBaseline] = useState<string | null>(null);
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('email_templates')
        .select(
          'id, name, subject, html_body, html_extensions, text_body, text_extensions, reference, test_data, created_at, updated_at',
        )
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setTemplates((data ?? []) as EmailTemplate[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load email templates.';
      setError(message);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadTemplates();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadTemplates]);

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.subject.toLowerCase().includes(term),
    );
  }, [templates, search]);

  const selectedTemplates = useMemo(
    () => templates.filter((t) => selectedIds.has(t.id)),
    [templates, selectedIds],
  );

  const selectedCount = selectedTemplates.length;
  const syncBusy = batchSyncing || syncingId !== null || dialogSyncing;

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= EMAIL_TEMPLATE_BATCH_MAX) {
          toast.error(
            `You can select at most ${EMAIL_TEMPLATE_BATCH_MAX} templates per batch.`,
          );
          return prev;
        }
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    const ids = filteredTemplates
      .slice(0, EMAIL_TEMPLATE_BATCH_MAX)
      .map((t) => t.id);
    if (filteredTemplates.length > EMAIL_TEMPLATE_BATCH_MAX) {
      toast.message(
        `Only the first ${EMAIL_TEMPLATE_BATCH_MAX} visible templates were selected (batch limit).`,
      );
    }
    setSelectedIds(new Set(ids));
  };

  const allFilteredSelected =
    filteredTemplates.length > 0 &&
    filteredTemplates.every((t) => selectedIds.has(t.id));

  const templateVariableKeys = useMemo(
    () =>
      extractTemplateVariables(
        form.subject,
        form.html_body,
        ...form.html_extensions,
        form.text_body,
        ...form.text_extensions,
      ),
    [form],
  );

  const filledTestDataCount = useMemo(
    () =>
      templateVariableKeys.filter((key) => testTemplateData[key]?.trim()).length,
    [templateVariableKeys, testTemplateData],
  );

  const isDialogDirty = useMemo(() => {
    if (!dialogOpen || dialogBaseline === null) return false;
    return snapshotDialogState(form, testTemplateData) !== dialogBaseline;
  }, [dialogOpen, dialogBaseline, form, testTemplateData]);

  const openCreate = () => {
    const empty = emptyEmailTemplateInput();
    setEditingId(null);
    setForm(empty);
    setTestTemplateData({});
    setDialogBaseline(snapshotDialogState(empty, {}));
    setBodyEditorTab('html');
    setUnsavedConfirmOpen(false);
    setDialogOpen(true);
  };

  const openEdit = (row: EmailTemplate) => {
    const input = templateToInput(row);
    const testData = normalizeTestData(row.test_data);
    setEditingId(row.id);
    setForm(input);
    setTestTemplateData(testData);
    setDialogBaseline(snapshotDialogState(input, testData));
    setBodyEditorTab('html');
    setUnsavedConfirmOpen(false);
    setDialogOpen(true);
  };

  const closeEditDialog = () => {
    setDialogOpen(false);
    setUnsavedConfirmOpen(false);
    setDialogBaseline(null);
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    if (open) {
      setDialogOpen(true);
      return;
    }
    if (!isDialogDirty) {
      closeEditDialog();
      return;
    }
    setUnsavedConfirmOpen(true);
  };

  const persistTemplate = async (): Promise<boolean> => {
    const validationError = validateForm(form);
    if (validationError) {
      toast.error(validationError);
      return false;
    }

    setSaving(true);
    try {
      const payload = buildPersistPayload(form, testTemplateData);

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('email_templates')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Template saved. Use Sync to push changes to AWS SES.');
      } else {
        const { error: insertError } = await supabase
          .from('email_templates')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Template saved. Use Sync to create it in AWS SES.');
      }

      setDialogBaseline(snapshotDialogState(form, testTemplateData));
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save email template.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const ok = await persistTemplate();
    if (ok) {
      closeEditDialog();
      await loadTemplates();
    }
  };

  const handleSaveAndCloseFromUnsaved = async () => {
    const ok = await persistTemplate();
    if (ok) {
      setUnsavedConfirmOpen(false);
      closeEditDialog();
      await loadTemplates();
    }
  };

  const handleDialogFormatHtml = () => {
    if (bodyEditorTab !== 'html') return;
    const hasHtml =
      form.html_body.trim() ||
      form.html_extensions.some((part) => part.trim());
    if (!hasHtml) {
      toast.error('No HTML to format.');
      return;
    }

    const [html_body, ...html_extensions] = formatHtmlFields([
      form.html_body,
      ...form.html_extensions,
    ]);
    setForm((f) => ({ ...f, html_body, html_extensions }));
    toast.success('HTML formatted.');
  };

  const formToSyncTemplate = (): EmailTemplate => ({
    id: editingId ?? '',
    name: form.name.trim(),
    subject: form.subject.trim(),
    html_body: form.html_body.trim(),
    html_extensions: form.html_extensions,
    text_body: form.text_body.trim() || null,
    text_extensions: form.text_extensions,
    reference: form.reference,
    test_data: testDataForSave(testTemplateData),
    created_at: '',
    updated_at: '',
  });

  const handleDialogSync = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Template name is required before syncing.');
      return;
    }
    if (!SES_TEMPLATE_NAME_PATTERN.test(name)) {
      toast.error(
        'Name may only contain letters, numbers, underscores, and hyphens (AWS SES).',
      );
      return;
    }
    if (!form.subject.trim()) {
      toast.error('Subject is required before syncing.');
      return;
    }
    if (!form.html_body.trim()) {
      toast.error('HTML body is required before syncing.');
      return;
    }

    setDialogSyncing(true);
    try {
      const result = await invokeEmailTemplateEdge('sync', formToSyncTemplate());
      if (result.failed && result.failed > 0) {
        const detail = result.results?.find((r) => !r.ok)?.error;
        throw new Error(detail ?? 'Sync failed');
      }
      toast.success(`Synced "${name}" to AWS SES.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to sync template to SES.',
      );
    } finally {
      setDialogSyncing(false);
    }
  };

  const handleSync = async (template: EmailTemplate) => {
    setSyncingId(template.id);
    try {
      const result = await invokeEmailTemplateEdge('sync', template);
      if (result.failed && result.failed > 0) {
        const detail = result.results?.find((r) => !r.ok)?.error;
        throw new Error(detail ?? 'Sync failed');
      }
      toast.success(`Synced "${template.name}" to AWS SES.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to sync template to SES.',
      );
    } finally {
      setSyncingId(null);
    }
  };

  const handleBatchSync = async () => {
    if (selectedCount === 0) return;
    setBatchSyncing(true);
    try {
      const result = await invokeEmailTemplateEdgeBatch('sync', selectedTemplates);
      const succeeded = result.succeeded ?? 0;
      const failed = result.failed ?? 0;

      if (failed === 0) {
        toast.success(
          `Synced ${succeeded} template${succeeded === 1 ? '' : 's'} to AWS SES.`,
        );
        setSelectedIds(new Set());
      } else {
        const failedNames = (result.results ?? [])
          .filter((r) => !r.ok)
          .map((r) => `${r.name}: ${r.error ?? 'failed'}`)
          .join('; ');
        toast.error(
          `Synced ${succeeded}, failed ${failed}. ${failedNames}`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to sync templates to SES.',
      );
    } finally {
      setBatchSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await invokeEmailTemplateEdge('delete', deleteTarget);

      const { error: deleteError } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success(`Deleted "${deleteTarget.name}" from the database and AWS SES.`);
      setDeleteTarget(null);
      await loadTemplates();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete email template.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Email templates">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Email templates">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage email templates.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Email templates">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Email templates</CardTitle>
              <CardDescription>
                Store templates in Supabase, then sync to AWS SES individually or
                in batches (up to {EMAIL_TEMPLATE_BATCH_MAX} at a time). Use{' '}
                <code className="text-xs">{'{{variable}}'}</code> in subject and
                body for SES merge fields.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={loading || templates.length === 0}
                onClick={() => setSendDialogOpen(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send email
              </Button>
              {selectedCount > 0 && (
                <Button
                  variant="secondary"
                  disabled={loading || syncBusy}
                  onClick={() => void handleBatchSync()}
                >
                  {batchSyncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CloudUpload className="mr-2 h-4 w-4" />
                  )}
                  Sync selected ({selectedCount}/{EMAIL_TEMPLATE_BATCH_MAX})
                </Button>
              )}
              <Button onClick={openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Input
              placeholder="Search by name or subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No email templates yet. Add one, then sync it to AWS SES.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={allFilteredSelected}
                          disabled={syncBusy || filteredTemplates.length === 0}
                          aria-label="Select all visible templates"
                          onChange={(e) =>
                            toggleSelectAllFiltered(e.target.checked)
                          }
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Subject
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Updated
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTemplates.map((t) => (
                      <tr
                        key={t.id}
                        className={`border-b last:border-0 ${
                          selectedIds.has(t.id) ? 'bg-muted/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={selectedIds.has(t.id)}
                            disabled={syncBusy}
                            aria-label={`Select ${t.name}`}
                            onChange={(e) =>
                              toggleSelected(t.id, e.target.checked)
                            }
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{t.name}</td>
                        <td className="px-4 py-3 text-sm">{t.subject}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(t.updated_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              title="Sync to AWS SES"
                              disabled={syncBusy || saving}
                              onClick={() => void handleSync(t)}
                            >
                              {syncingId === t.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CloudUpload className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Edit"
                              onClick={() => openEdit(t)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Delete"
                              onClick={() => setDeleteTarget(t)}
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

      <Dialog open={dialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="fixed inset-0 top-0 left-0 z-50 flex h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-lg sm:max-w-none">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>
              {editingId !== null ? 'Edit template' : 'Add template'}
            </DialogTitle>
            <DialogDescription>
              The name is the AWS SES template ID. It cannot be changed after
              creation. Saving only updates the database — use Sync to push to SES.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
            <div className="grid shrink-0 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="template-name">Name (SES template ID)</Label>
                <Input
                  id="template-name"
                  value={form.name}
                  disabled={editingId !== null}
                  placeholder="order_confirmation"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, underscores, and hyphens only.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="template-subject">Subject</Label>
                <Input
                  id="template-subject"
                  value={form.subject}
                  placeholder="Your order {{orderId}}"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  &nbsp;
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <Label>Body</Label>
                <div className="flex rounded-md border p-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={bodyEditorTab === 'html' ? 'default' : 'ghost'}
                    className="h-7 px-3"
                    onClick={() => setBodyEditorTab('html')}
                  >
                    HTML
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={bodyEditorTab === 'text' ? 'default' : 'ghost'}
                    className="h-7 px-3"
                    onClick={() => setBodyEditorTab('text')}
                  >
                    Plain text
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <TemplateExtensionsEditor
                  key={`${editingId ?? 'new'}-${bodyEditorTab}`}
                  mode={bodyEditorTab}
                  mainValue={
                    bodyEditorTab === 'html' ? form.html_body : form.text_body
                  }
                  onMainChange={(value) =>
                    setForm((f) =>
                      bodyEditorTab === 'html'
                        ? { ...f, html_body: value }
                        : { ...f, text_body: value },
                    )
                  }
                  extensions={
                    bodyEditorTab === 'html'
                      ? form.html_extensions
                      : form.text_extensions
                  }
                  onExtensionsChange={(extensions) =>
                    setForm((f) =>
                      bodyEditorTab === 'html'
                        ? { ...f, html_extensions: extensions }
                        : { ...f, text_extensions: extensions },
                    )
                  }
                  mainPlaceholder={
                    bodyEditorTab === 'html'
                      ? '<p>Hello {{customerName}}, …</p>'
                      : 'Hello {{customerName}}, …'
                  }
                  extensionPlaceholder={
                    bodyEditorTab === 'html'
                      ? '<p>Extension HTML…</p>'
                      : 'Extension plain text…'
                  }
                  className="h-full"
                  previewVariables={
                    bodyEditorTab === 'html' ? testTemplateData : undefined
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReferencesDialogOpen(true)}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Asset references
                {Object.keys(form.reference).length > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    ({Object.keys(form.reference).length})
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTestDataDialogOpen(true)}
              >
                <TestTube2Icon className="mr-2 h-4 w-4" />
                Test data
                {filledTestDataCount > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    ({filledTestDataCount})
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={bodyEditorTab !== 'html' || saving || dialogSyncing}
                onClick={handleDialogFormatHtml}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Format HTML
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving || syncBusy}
                onClick={() => void handleDialogSync()}
              >
                {dialogSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                Sync to AWS SES
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleEditDialogOpenChange(false)}
                disabled={saving || dialogSyncing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving || dialogSyncing}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailTemplateReferencesDialog
        open={referencesDialogOpen}
        onOpenChange={setReferencesDialogOpen}
        reference={form.reference}
        onReferenceChange={(reference) =>
          setForm((f) => ({ ...f, reference }))
        }
        templateName={form.name.trim() || undefined}
      />

      <EmailTemplateTestDataDialog
        open={testDataDialogOpen}
        onOpenChange={setTestDataDialogOpen}
        variableKeys={templateVariableKeys}
        testData={testTemplateData}
        onTestDataChange={setTestTemplateData}
      />

      <SendEmailDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        templates={templates}
      />

      <AlertDialog
        open={unsavedConfirmOpen}
        onOpenChange={setUnsavedConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              This template has changes that are not saved yet, including test
              data. Save before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep editing</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setUnsavedConfirmOpen(false);
                closeEditDialog();
              }}
            >
              Discard
            </Button>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleSaveAndCloseFromUnsaved();
              }}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
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
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{deleteTarget?.name}</strong> from AWS SES
              and the database. This cannot be undone.
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
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
