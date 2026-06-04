const TEMPLATE_VAR_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

/** Unique {{variable}} names found in template parts. */
export function extractTemplateVariables(
  ...parts: (string | null | undefined)[]
): string[] {
  const names = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    for (const match of part.matchAll(TEMPLATE_VAR_PATTERN)) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

export function renderTemplateString(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(TEMPLATE_VAR_PATTERN, (full, key: string) => {
    const value = variables[key];
    return value !== undefined && value !== '' ? value : full;
  });
}

export function parseEmailAddressList(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailAddressList(
  raw: string,
  fieldLabel: string,
  required = false,
): string | null {
  const emails = parseEmailAddressList(raw);
  if (required && emails.length === 0) {
    return `${fieldLabel} is required.`;
  }
  for (const email of emails) {
    if (!EMAIL_PATTERN.test(email)) {
      return `Invalid ${fieldLabel} address: ${email}`;
    }
  }
  return null;
}
