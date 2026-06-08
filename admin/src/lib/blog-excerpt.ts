import { htmlContentToPlainText, htmlToPlainText } from '@/lib/html-to-plain-text';

const DEFAULT_MAX_LENGTH = 280;

function truncateAtBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const slice = text.slice(0, maxLength);
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
  );

  if (sentenceEnd >= maxLength * 0.45) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > 0) {
    return `${slice.slice(0, lastSpace).trim()}…`;
  }

  return `${slice.trim()}…`;
}

export type GenerateBlogExcerptInput = {
  title?: string;
  content: string;
  maxLength?: number;
};

export function generateExcerptFromBlogPost({
  title = '',
  content,
  maxLength = DEFAULT_MAX_LENGTH,
}: GenerateBlogExcerptInput): string {
  const plain = htmlContentToPlainText(content)
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

  if (plain) {
    return truncateAtBoundary(plain, maxLength);
  }

  return htmlToPlainText(title);
}
