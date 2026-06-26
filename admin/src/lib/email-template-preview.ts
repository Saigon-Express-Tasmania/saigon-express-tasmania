const TEMPLATE_VAR_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;
const BREVO_CONTROL_TAG_PATTERN = /\{%[\s\S]*?%\}/g;

/** Removes Brevo/Django control blocks (e.g. {% autoescape off %}) from preview output. */
export function stripBrevoControlTags(template: string): string {
  return template.replace(BREVO_CONTROL_TAG_PATTERN, '');
}

/** Unique {{variable}} names found in template parts. */
export function extractTemplateVariables(
  ...parts: (string | null | undefined)[]
): string[] {
  const names = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    const stripped = stripBrevoControlTags(part);
    for (const match of stripped.matchAll(TEMPLATE_VAR_PATTERN)) {
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

/** True when `index` sits inside a quoted HTML attribute value (e.g. href="{{url}}"). */
export function isInsideHtmlAttribute(html: string, index: number): boolean {
  let inDouble = false;
  let inSingle = false;
  let inTag = false;

  for (let i = 0; i < index; i += 1) {
    if (html.startsWith('<!--', i)) {
      const close = html.indexOf('-->', i + 4);
      if (close === -1) break;
      i = close + 2;
      continue;
    }

    if (!inDouble && !inSingle) {
      if (html[i] === '<') {
        inTag = true;
        continue;
      }
      if (html[i] === '>') {
        inTag = false;
        continue;
      }
    }

    if (!inTag) continue;

    if (html[i] === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (html[i] === "'" && !inDouble) {
      inSingle = !inSingle;
    }
  }

  return inDouble || inSingle;
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
  const stripped = stripBrevoControlTags(template);
  return stripped.replace(TEMPLATE_VAR_PATTERN, (full, key: string, offset: number) => {
    const value = variables[key];
    if (value === undefined || value === '') return full;

    if (options?.highlightColor !== undefined) {
      const safeColor = sanitizePreviewHighlightColor(options.highlightColor);
      if (safeColor && isInsideHtmlAttribute(stripped, offset)) {
        return value;
      }
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

type EmailPreviewSrcDocOptions = {
  inspectMode?: boolean;
};

/** Full HTML document for iframe preview at a fixed viewport width (mobile / desktop sim). */
export function buildEmailPreviewSrcDoc(
  bodyHtml: string,
  viewportWidth: number,
  options?: EmailPreviewSrcDocOptions,
): string {
  const inspectCss = options?.inspectMode
    ? `
    .html-preview-inspect,
    .html-preview-inspect * {
      cursor: crosshair !important;
    }
    .__html-inspect-hover {
      outline: 2px solid rgb(59, 130, 246) !important;
      outline-offset: 1px;
    }
    `
    : '';

  const bodyClass = options?.inspectMode ? ' class="html-preview-inspect"' : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${viewportWidth}, initial-scale=1">
<style>
  html {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  body {
    margin: 0;
    padding: 16px;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
    background: #ffffff;
    color: #0a0a0a;
    font-size: 14px;
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    box-sizing: border-box;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
  img, video, svg, canvas, embed, object, iframe {
    max-width: 100% !important;
    height: auto !important;
  }
  td, th {
    word-wrap: break-word;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  pre, code {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    overflow-wrap: anywhere;
  }
  a {
    color: hsl(221.2 83.2% 53.3%);
    word-break: break-word;
  }
  ${inspectCss}
</style>
</head>
<body${bodyClass}>
${bodyHtml}
</body>
</html>`;
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
