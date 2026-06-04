export type EmailTemplateReference = Record<string, string>;

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  reference: EmailTemplateReference;
  created_at: string;
  updated_at: string;
};

export type EmailTemplateInput = {
  name: string;
  subject: string;
  html_body: string;
  text_body: string;
  reference: EmailTemplateReference;
};

export const emptyEmailTemplateInput = (): EmailTemplateInput => ({
  name: '',
  subject: '',
  html_body: '',
  text_body: '',
  reference: {},
});

export const SES_TEMPLATE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export function normalizeEmailTemplateReference(
  value: unknown,
): EmailTemplateReference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: EmailTemplateReference = {};
  for (const [key, raw] of Object.entries(value)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    result[trimmedKey] = String(raw ?? '');
  }
  return result;
}

export function referenceKeyFromFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  return base.trim() || `file-${Date.now()}`;
}
