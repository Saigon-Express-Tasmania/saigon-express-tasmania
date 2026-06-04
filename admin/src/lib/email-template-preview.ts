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

export const DEFAULT_PREVIEW_HIGHLIGHT_COLOR = '#fef08a';
export const PREVIEW_HIGHLIGHT_TRANSPARENT = 'transparent';

export function isPreviewHighlightDisabled(color: string): boolean {
  const normalized = color.trim().toLowerCase();
  return (
    normalized === PREVIEW_HIGHLIGHT_TRANSPARENT ||
    normalized === 'none' ||
    normalized === '#00000000' ||
    normalized === 'rgba(0,0,0,0)' ||
    normalized === 'rgba(0, 0, 0, 0)'
  );
}

/** Returns a safe CSS color, or null when highlighting is off (transparent). */
export function sanitizePreviewHighlightColor(color: string): string | null {
  if (isPreviewHighlightDisabled(color)) return null;

  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^rgba?\([\d\s,%.]+\)$/.test(trimmed)) return trimmed;
  return DEFAULT_PREVIEW_HIGHLIGHT_COLOR;
}

function looksLikeHtmlFragment(value: string): boolean {
  const trimmed = value.trim();
  return /^<[a-zA-Z][\w:-]*(\s|>|\/)/.test(trimmed);
}

function mergeStyleIntoTagAttrs(attrs: string, declaration: string): string {
  const styleMatch = attrs.match(/style\s*=\s*(["'])(.*?)\1/i);
  if (styleMatch) {
    const quote = styleMatch[1];
    const existing = styleMatch[2].trim();
    const merged = existing
      ? existing.endsWith(';')
        ? `${existing}${declaration}`
        : `${existing};${declaration}`
      : declaration;
    return attrs.replace(styleMatch[0], `style=${quote}${merged}${quote}`);
  }

  const gap = attrs.trim() ? `${attrs} ` : ' ';
  return `${gap}style="${declaration}"`;
}

/** Merges background-color into the outermost opening tag's style attribute. */
export function embedHighlightInHtml(html: string, backgroundColor: string): string {
  const declaration = `background-color:${backgroundColor}`;
  const trimmed = html.trim();

  return trimmed.replace(
    /^(\s*)<([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/,
    (_match, leading: string, tag: string, attrs: string, selfClose: string) => {
      const newAttrs = mergeStyleIntoTagAttrs(attrs, declaration);
      return `${leading}<${tag}${newAttrs}${selfClose}>`;
    },
  );
}

function applyPreviewSubstitution(value: string, safeColor: string | null): string {
  if (!safeColor) return value;

  if (looksLikeHtmlFragment(value)) {
    return embedHighlightInHtml(value, safeColor);
  }

  return `<span class="template-preview-var" style="background-color:${safeColor};border-radius:2px;padding:0 1px;">${value}</span>`;
}

export function renderTemplateString(
  template: string,
  variables: Record<string, string>,
  options?: { highlightColor?: string },
): string {
  return template.replace(TEMPLATE_VAR_PATTERN, (full, key: string) => {
    const value = variables[key];
    if (value === undefined || value === '') return full;

    if (options?.highlightColor !== undefined) {
      const safeColor = sanitizePreviewHighlightColor(options.highlightColor);
      return applyPreviewSubstitution(value, safeColor);
    }

    return value;
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
