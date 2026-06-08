import { htmlToPlainText } from '@/lib/html-to-plain-text';

const MAX_TAG_COUNT = 10;
const MIN_KEYWORD_LENGTH = 3;

const STOP_WORDS = new Set(
  [
    'a',
    'about',
    'after',
    'all',
    'also',
    'an',
    'and',
    'any',
    'are',
    'as',
    'at',
    'be',
    'been',
    'before',
    'being',
    'but',
    'by',
    'can',
    'come',
    'could',
    'did',
    'do',
    'does',
    'doing',
    'done',
    'each',
    'for',
    'from',
    'get',
    'got',
    'had',
    'has',
    'have',
    'he',
    'her',
    'here',
    'him',
    'his',
    'how',
    'if',
    'in',
    'into',
    'is',
    'it',
    'its',
    'just',
    'like',
    'make',
    'many',
    'may',
    'more',
    'most',
    'much',
    'must',
    'new',
    'news',
    'not',
    'now',
    'of',
    'on',
    'one',
    'only',
    'or',
    'other',
    'our',
    'out',
    'over',
    'own',
    'read',
    'said',
    'say',
    'see',
    'she',
    'should',
    'so',
    'some',
    'such',
    'than',
    'that',
    'the',
    'their',
    'them',
    'then',
    'there',
    'these',
    'they',
    'this',
    'those',
    'through',
    'to',
    'too',
    'under',
    'up',
    'us',
    'very',
    'was',
    'we',
    'were',
    'what',
    'when',
    'where',
    'which',
    'who',
    'why',
    'will',
    'with',
    'would',
    'you',
    'your',
    'www',
    'http',
    'https',
    'com',
    'img',
    'src',
    'alt',
    'class',
    'style',
    'div',
    'span',
    'href',
    'html',
    'nbsp',
  ].map((word) => word.toLowerCase()),
);

const GENERIC_CATEGORY_WORDS = new Set(['news', 'blog', 'article', 'update']);

function tokenize(text: string): string[] {
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu);
  return matches ?? [];
}

function formatTag(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';

  if (
    trimmed !== trimmed.toLowerCase() &&
    trimmed !== trimmed.toUpperCase()
  ) {
    return trimmed;
  }

  if (trimmed === trimmed.toUpperCase() && trimmed.length <= 4) {
    return trimmed;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

type ScoredKeyword = {
  key: string;
  score: number;
  display: string;
};

function scoreText(text: string, weight: number, scores: Map<string, ScoredKeyword>) {
  const tokens = tokenize(htmlToPlainText(text));
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (key.length < MIN_KEYWORD_LENGTH) continue;
    if (STOP_WORDS.has(key)) continue;
    if (/^\d+$/.test(key)) continue;

    const properNounBoost =
      token[0] === token[0]?.toUpperCase() && token[0] !== token[0]?.toLowerCase()
        ? 1.5
        : 1;
    const increment = weight * properNounBoost;

    const existing = scores.get(key);
    if (existing) {
      existing.score += increment;
      if (token[0] === token[0]?.toUpperCase()) {
        existing.display = formatTag(token);
      }
    } else {
      scores.set(key, {
        key,
        score: increment,
        display: formatTag(token),
      });
    }
  }
}

export type GenerateBlogTagsInput = {
  title: string;
  excerpt: string;
  content: string;
  category?: string;
  maxTags?: number;
};

export function generateTagsFromBlogPost({
  title,
  excerpt,
  content,
  category,
  maxTags = MAX_TAG_COUNT,
}: GenerateBlogTagsInput): string[] {
  const scores = new Map<string, ScoredKeyword>();

  if (title.trim()) scoreText(title, 4, scores);
  if (excerpt.trim()) scoreText(excerpt, 3, scores);
  if (content.trim()) scoreText(content, 1, scores);

  const categoryKey = category?.trim().toLowerCase() ?? '';
  if (categoryKey && !GENERIC_CATEGORY_WORDS.has(categoryKey)) {
    const categoryToken = formatTag(category!.trim());
    scores.set(categoryKey, {
      key: categoryKey,
      score: (scores.get(categoryKey)?.score ?? 0) + 2,
      display: categoryToken,
    });
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.display.localeCompare(b.display))
    .slice(0, maxTags)
    .map((entry) => entry.display)
    .filter(Boolean);
}
