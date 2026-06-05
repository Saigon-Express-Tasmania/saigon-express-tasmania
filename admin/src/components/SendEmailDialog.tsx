import { Button } from '@/components/ui/button';
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
import {
  extractTemplateVariables,
  renderTemplateString,
  validateEmailAddressList,
} from '@/lib/email-template-preview';
import { invokeSendEmail } from '@/lib/send-email-api';
import type { EmailTemplate } from '@/types/EmailTemplate';
import { Loader2, Mail } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type PreviewTab = 'html' | 'text';

type SendEmailForm = {
  templateId: string;
  method: 'ses' | 'mailtrap';
  to: string;
  cc: string;
  bcc: string;
  senderEmail: string;
  senderName: string;
  variables: Record<string, string>;
};

const emptySendForm = (): SendEmailForm => ({
  templateId: '',
  method: 'ses',
  to: '',
  cc: '',
  bcc: '',
  senderEmail: '',
  senderName: 'Saigon Express Tasmania',
  variables: {},
});

type SendEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EmailTemplate[];
};

export function SendEmailDialog({
  open,
  onOpenChange,
  templates,
}: SendEmailDialogProps) {
  const [form, setForm] = useState<SendEmailForm>(emptySendForm);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('html');
  const [sending, setSending] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === form.templateId) ?? null,
    [templates, form.templateId],
  );

  const variableKeys = useMemo(() => {
    if (!selectedTemplate) return [];
    return extractTemplateVariables(
      selectedTemplate.subject,
      selectedTemplate.html_body,
      selectedTemplate.text_body,
    );
  }, [selectedTemplate]);

  useEffect(() => {
    if (!open) {
      setForm(emptySendForm());
      setPreviewTab('html');
      return;
    }
    if (templates.length === 1 && !form.templateId) {
      setForm((f) => ({ ...f, templateId: templates[0].id }));
    }
  }, [open, templates, form.templateId]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setForm((f) => {
      const nextVars: Record<string, string> = {};
      for (const key of variableKeys) {
        nextVars[key] = f.variables[key] ?? '';
      }
      return { ...f, variables: nextVars };
    });
  }, [selectedTemplate?.id, variableKeys.join(',')]);

  const previewSubject = useMemo(() => {
    if (!selectedTemplate) return '';
    return renderTemplateString(selectedTemplate.subject, form.variables);
  }, [selectedTemplate, form.variables]);

  const previewHtml = useMemo(() => {
    if (!selectedTemplate) return '';
    return renderTemplateString(selectedTemplate.html_body, form.variables);
  }, [selectedTemplate, form.variables]);

  const previewText = useMemo(() => {
    if (!selectedTemplate) return '';
    const text = selectedTemplate.text_body?.trim();
    if (text) {
      return renderTemplateString(text, form.variables);
    }
    return '(No plain-text body on this template)';
  }, [selectedTemplate, form.variables]);

  const handleSend = async () => {
    if (!selectedTemplate) {
      toast.error('Select a template.');
      return;
    }

    const toError = validateEmailAddressList(form.to, 'To', true);
    if (toError) {
      toast.error(toError);
      return;
    }
    const ccError = validateEmailAddressList(form.cc, 'CC');
    if (ccError) {
      toast.error(ccError);
      return;
    }
    const bccError = validateEmailAddressList(form.bcc, 'BCC');
    if (bccError) {
      toast.error(bccError);
      return;
    }

    setSending(true);
    try {
      const templateVariables: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(form.variables)) {
        const trimmed = value.trim();
        if (!trimmed) continue;
        const asNumber = Number(trimmed);
        templateVariables[key] =
          trimmed !== '' && !Number.isNaN(asNumber) && /^-?\d+(\.\d+)?$/.test(trimmed)
            ? asNumber
            : trimmed;
      }

      const result = await invokeSendEmail({
        method: form.method,
        to: form.to,
        cc: form.cc,
        bcc: form.bcc,
        senderEmail: form.senderEmail || undefined,
        senderName: form.senderName || undefined,
        templateId: selectedTemplate.name,
        templateVariables,
      });

      toast.success(
        result.messageId
          ? `Email sent (message id: ${result.messageId})`
          : 'Email sent successfully.',
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Send email</DialogTitle>
          <DialogDescription>
            Send a templated email via AWS SES or Mailtrap. Preview uses your
            template variables; SES uses the synced template on AWS.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Template</Label>
            <Select
              value={form.templateId || undefined}
              onValueChange={(id) =>
                setForm((f) => ({ ...f, templateId: id }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Provider</Label>
            <Select
              value={form.method}
              onValueChange={(method) =>
                setForm((f) => ({
                  ...f,
                  method: method as 'ses' | 'mailtrap',
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ses">AWS SES</SelectItem>
                <SelectItem value="mailtrap">Mailtrap</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="send-to">To</Label>
            <Input
              id="send-to"
              type="text"
              placeholder="one@example.com; two@example.com"
              value={form.to}
              onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple recipients with semicolons.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="send-cc">CC</Label>
            <Input
              id="send-cc"
              placeholder="cc1@example.com; cc2@example.com"
              value={form.cc}
              onChange={(e) => setForm((f) => ({ ...f, cc: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="send-bcc">BCC</Label>
            <Input
              id="send-bcc"
              placeholder="bcc1@example.com; bcc2@example.com"
              value={form.bcc}
              onChange={(e) => setForm((f) => ({ ...f, bcc: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="send-from-email">From email (optional)</Label>
            <Input
              id="send-from-email"
              type="email"
              placeholder="noreply@saigonexpresstasmania.com.au"
              value={form.senderEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, senderEmail: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="send-from-name">From name (optional)</Label>
            <Input
              id="send-from-name"
              value={form.senderName}
              onChange={(e) =>
                setForm((f) => ({ ...f, senderName: e.target.value }))
              }
            />
          </div>

          {variableKeys.length > 0 && (
            <div className="grid gap-3 md:col-span-2">
              <Label>Template variables</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {variableKeys.map((key) => (
                  <div key={key} className="grid gap-1.5">
                    <Label htmlFor={`var-${key}`} className="font-mono text-xs">
                      {`{{${key}}}`}
                    </Label>
                    <Input
                      id={`var-${key}`}
                      value={form.variables[key] ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          variables: {
                            ...f.variables,
                            [key]: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2 md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Preview</Label>
              <div className="flex rounded-md border p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={previewTab === 'html' ? 'default' : 'ghost'}
                  className="h-7 px-3"
                  onClick={() => setPreviewTab('html')}
                >
                  HTML
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewTab === 'text' ? 'default' : 'ghost'}
                  className="h-7 px-3"
                  onClick={() => setPreviewTab('text')}
                >
                  Text
                </Button>
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">
              Subject: {previewSubject || '—'}
            </p>
            {previewTab === 'html' ? (
              <div
                className="min-h-[200px] rounded-md border bg-white p-4 text-sm text-foreground [&_a]:text-primary"
                dangerouslySetInnerHTML={{
                  __html: previewHtml || '<p class="text-muted-foreground">—</p>',
                }}
              />
            ) : (
              <pre className="min-h-[200px] whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">
                {previewText}
              </pre>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSend()}
            disabled={sending || !selectedTemplate}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
