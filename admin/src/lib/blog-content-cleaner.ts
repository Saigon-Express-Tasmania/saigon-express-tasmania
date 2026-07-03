const SENTENCE_END_PATTERN = /[.!?][)"'\u201d\u2019]*$/;

const PRESERVED_EMBEDDED_TAGS = [
  'IMG',
  'VIDEO',
  'IFRAME',
  'EMBED',
  'OBJECT',
  'PICTURE',
  'SVG',
  'FIGURE',
  'AUDIO',
  'CANVAS',
] as const;

function hasPreservedEmbeddedContent(element: Element): boolean {
  if (
    PRESERVED_EMBEDDED_TAGS.includes(
      element.tagName as (typeof PRESERVED_EMBEDDED_TAGS)[number],
    )
  ) {
    return true;
  }

  return PRESERVED_EMBEDDED_TAGS.some((tag) =>
    Boolean(element.querySelector(tag.toLowerCase())),
  );
}

function getPlainText(element: Element): string {
  return (element.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function paragraphEndsSentence(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return SENTENCE_END_PATTERN.test(trimmed);
}

function isEmptyParagraph(element: Element): boolean {
  if (hasPreservedEmbeddedContent(element)) return false;

  const html = element.innerHTML
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return !html || !getPlainText(element);
}

function isLabelParagraph(element: Element): boolean {
  const text = getPlainText(element);
  if (!text || text.length > 48) return false;
  if (/[.!?]/.test(text)) return false;

  const childElements = element.querySelectorAll('*');
  if (
    childElements.length === 1 &&
    childElements[0]?.tagName === 'STRONG' &&
    getPlainText(childElements[0]) === text
  ) {
    return true;
  }

  return /^[A-Z][A-Za-z0-9\s/&–-]+$/.test(text);
}

function shouldMergeParagraphs(current: Element, next: Element): boolean {
  if (hasPreservedEmbeddedContent(current) || hasPreservedEmbeddedContent(next)) {
    return false;
  }

  const currentText = getPlainText(current);
  const nextText = getPlainText(next);

  if (!currentText || !nextText) return false;
  if (paragraphEndsSentence(currentText)) return false;
  if (isLabelParagraph(current)) return false;
  if (/^[A-Z0-9"([]/.test(nextText)) return false;

  return /^[a-z(,]/.test(nextText);
}

function replaceNbspInTree(root: ParentNode) {
  const walker = root.ownerDocument?.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );

  if (!walker) return;

  let node = walker.nextNode();
  while (node) {
    if (node.textContent?.includes('\u00a0')) {
      node.textContent = node.textContent.replace(/\u00a0/g, ' ');
    }
    node = walker.nextNode();
  }
}

function unwrapElements(root: ParentNode, selector: string) {
  const matches = root.querySelectorAll(selector);
  matches.forEach((element) => {
    const parent = element.parentNode;
    if (!parent) return;

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
  });
}

function stripQuillArtifacts(root: Element) {
  root.querySelectorAll('[contenteditable]').forEach((element) => {
    element.removeAttribute('contenteditable');
  });

  root.querySelectorAll('[data-placeholder]').forEach((element) => {
    element.removeAttribute('data-placeholder');
  });

  root.querySelectorAll('[class]').forEach((element) => {
    const classes = Array.from(element.classList).filter(
      (className) => !className.startsWith('ql-'),
    );
    if (classes.length === 0) {
      element.removeAttribute('class');
    } else {
      element.className = classes.join(' ');
    }
  });
}

function mergeParagraphElements(first: HTMLElement, second: HTMLElement) {
  const doc = first.ownerDocument;
  if (!doc) return;

  const firstText = getPlainText(first);
  const secondText = getPlainText(second);

  if (firstText && secondText && !/\s$/.test(firstText)) {
    first.appendChild(doc.createTextNode(' '));
  }

  while (second.firstChild) {
    first.appendChild(second.firstChild);
  }
}

function mergeBrokenParagraphs(container: Element) {
  let index = 0;

  while (index < container.children.length - 1) {
    const current = container.children[index];
    const next = container.children[index + 1];

    if (current.tagName === 'P' && next.tagName === 'P') {
      if (isEmptyParagraph(current)) {
        current.remove();
        continue;
      }

      if (isEmptyParagraph(next)) {
        next.remove();
        continue;
      }

      if (shouldMergeParagraphs(current, next)) {
        mergeParagraphElements(current as HTMLElement, next as HTMLElement);
        next.remove();
        continue;
      }
    }

    index += 1;
  }

  Array.from(container.children).forEach((child) => {
    if (child.tagName === 'DIV') {
      mergeBrokenParagraphs(child);
    }
  });

  Array.from(container.children).forEach((child) => {
    if (child.tagName === 'P' && isEmptyParagraph(child)) {
      child.remove();
    }
    if (/^H[1-6]$/.test(child.tagName) && isEmptyParagraph(child)) {
      child.remove();
    }
  });
}

/** Clean pasted blog HTML: unwrap Quill shells, fix nbsp, merge broken paragraphs. */
export function cleanBlogPostContent(html: string): string {
  const source = html.replace(/&nbsp;/gi, ' ').trim();
  if (!source) return html;

  const doc = new DOMParser().parseFromString(source, 'text/html');
  const { body } = doc;

  unwrapElements(body, '.ql-editor');
  stripQuillArtifacts(body);
  replaceNbspInTree(body);
  mergeBrokenParagraphs(body);

  return body.innerHTML.trim();
}
