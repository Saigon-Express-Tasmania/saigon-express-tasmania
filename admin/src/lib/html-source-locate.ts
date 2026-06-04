export const INSPECT_SOURCE_ATTR = 'data-hse-off';

function findTagCloseIndex(html: string, openIndex: number): number {
  let quote: '"' | "'" | null = null;
  for (let i = openIndex + 1; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '>') return i;
  }
  return html.length - 1;
}

/** Injects source byte offsets on opening tags so preview clicks map reliably to the editor. */
export function injectInspectMarkers(html: string): string {
  const inserts: { pos: number; text: string }[] = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] !== '<') {
      i++;
      continue;
    }

    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i);
      i = end === -1 ? html.length : end + 3;
      continue;
    }

    const next = html[i + 1];
    if (next === '/' || next === '!' || next === '?') {
      i = findTagCloseIndex(html, i) + 1;
      continue;
    }

    const openIndex = i;
    const close = findTagCloseIndex(html, i);
    const snippet = html.slice(i, close + 1);

    if (!snippet.startsWith('</') && /^<[a-zA-Z][\w:-]*/.test(snippet)) {
      if (!snippet.includes(INSPECT_SOURCE_ATTR)) {
        inserts.push({
          pos: close,
          text: ` ${INSPECT_SOURCE_ATTR}="${openIndex}"`,
        });
      }
    }

    i = close + 1;
  }

  let out = html;
  for (const { pos, text } of inserts.sort((a, b) => b.pos - a.pos)) {
    out = out.slice(0, pos) + text + out.slice(pos);
  }

  return out;
}

export function readInspectSourceOffset(element: Element | null): number | null {
  let el: Element | null = element;
  while (el) {
    const raw = el.getAttribute(INSPECT_SOURCE_ATTR);
    if (raw != null) {
      const index = Number.parseInt(raw, 10);
      if (!Number.isNaN(index)) return index;
    }
    el = el.parentElement;
  }
  return null;
}

export function scrollTextareaToIndex(
  textarea: HTMLTextAreaElement,
  scrollParent: HTMLElement,
  index: number,
): void {
  const text = textarea.value;
  const safeIndex = Math.max(0, Math.min(index, text.length));

  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(safeIndex, safeIndex);

  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  mirror.setAttribute('aria-hidden', 'true');
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.pointerEvents = 'none';
  mirror.style.top = '0';
  mirror.style.left = '-9999px';
  mirror.style.whiteSpace = 'pre';
  mirror.style.font = style.font;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.boxSizing = style.boxSizing;
  mirror.style.width = `${textarea.offsetWidth}px`;
  mirror.textContent = `${text.slice(0, safeIndex)}\u200b`;

  document.body.appendChild(mirror);
  const caretTop = mirror.offsetHeight;
  document.body.removeChild(mirror);

  scrollParent.scrollTop = Math.max(
    0,
    caretTop - scrollParent.clientHeight / 3,
  );
}
