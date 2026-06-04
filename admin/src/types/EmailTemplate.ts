export type EmailTemplateReference = Record<string, string>;
export type EmailTemplateTestData = Record<string, string>;

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  html_extensions: string[];
  text_body: string | null;
  text_extensions: string[];
  reference: EmailTemplateReference;
  test_data: EmailTemplateTestData;
  created_at: string;
  updated_at: string;
};

export type EmailTemplateInput = {
  name: string;
  subject: string;
  html_body: string;
  html_extensions: string[];
  text_body: string;
  text_extensions: string[];
  reference: EmailTemplateReference;
};

export const emptyEmailTemplateInput = (): EmailTemplateInput => ({
  name: '',
  subject: '',
  html_body: '',
  html_extensions: [],
  text_body: '',
  text_extensions: [],
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

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? ''));
}

export function trimStringArray(values: string[]): string[] {
  return values.map((item) => item.trim()).filter(Boolean);
}

export function normalizeTestData(value: unknown): EmailTemplateTestData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: EmailTemplateTestData = {};
  for (const [key, raw] of Object.entries(value)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    const trimmedValue = String(raw ?? '').trim();
    if (trimmedValue) result[trimmedKey] = trimmedValue;
  }
  return result;
}

/** Non-empty test values only, for persistence and dirty checks. */
export function testDataForSave(data: EmailTemplateTestData): EmailTemplateTestData {
  return normalizeTestData(data);
}

export function referenceKeyFromFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  return base.trim() || `file-${Date.now()}`;
}
