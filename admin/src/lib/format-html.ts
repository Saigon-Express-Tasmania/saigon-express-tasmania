const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function tagNameFromOpenToken(token: string): string | null {
  const match = token.match(/^<([a-zA-Z][\w:-]*)/);
  return match?.[1]?.toLowerCase() ?? null;
}

function isVoidOrSelfClosing(token: string, tag: string | null): boolean {
  if (!tag) return false;
  if (VOID_TAGS.has(tag)) return true;
  return /\/>\s*$/.test(token);
}

/** Indents HTML tags for readability; leaves template variables untouched. */
export function formatHtml(html: string): string {
  const source = html.trim();
  if (!source) return html;

  const tokens: string[] = [];
  let i = 0;

  while (i < source.length) {
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i);
      if (end === -1) {
        tokens.push(source.slice(i));
        break;
      }
      tokens.push(source.slice(i, end + 3));
      i = end + 3;
      continue;
    }

    if (source[i] === '<') {
      let close = i + 1;
      let quote: '"' | "'" | null = null;
      while (close < source.length) {
        const ch = source[close];
        if (quote) {
          if (ch === quote) quote = null;
          close++;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          close++;
          continue;
        }
        if (ch === '>') {
          close++;
          break;
        }
        close++;
      }
      tokens.push(source.slice(i, close));
      i = close;
      continue;
    }

    const nextTag = source.indexOf('<', i);
    const end = nextTag === -1 ? source.length : nextTag;
    const text = source.slice(i, end);
    if (text.trim()) tokens.push(text.trim());
    i = end;
  }

  const lines: string[] = [];
  let depth = 0;

  for (const token of tokens) {
    if (token.startsWith('<!--')) {
      lines.push(`${'  '.repeat(depth)}${token}`);
      continue;
    }

    if (token.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      lines.push(`${'  '.repeat(depth)}${token}`);
      continue;
    }

    if (token.startsWith('<')) {
      const tag = tagNameFromOpenToken(token);
      lines.push(`${'  '.repeat(depth)}${token}`);
      if (!isVoidOrSelfClosing(token, tag)) depth++;
      continue;
    }

    lines.push(`${'  '.repeat(depth)}${token}`);
  }

  return `${lines.join('\n')}\n`;
}

export function formatHtmlFields(values: string[]): string[] {
  return values.map((value) => (value.trim() ? formatHtml(value) : value));
}
