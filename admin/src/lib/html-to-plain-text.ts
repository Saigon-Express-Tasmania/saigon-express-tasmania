function normalizePlainText(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlToText(html: string): string {
  if (!html.trim()) return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');
  return normalizePlainText(doc.body.textContent ?? '');
}

/** Decode entities and strip tags from HTML or plain text. */
export function htmlToPlainText(html: string): string {
  return decodeHtmlToText(html);
}

/** Like htmlToPlainText, but treats block elements as sentence breaks first. */
export function htmlContentToPlainText(html: string): string {
  if (!html.trim()) return '';

  const withBlockBreaks = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|section|article|blockquote|h[1-6]|li)>/gi, '. ');

  return decodeHtmlToText(withBlockBreaks);
}
