import type { ImageUrlsMap } from '@/lib/image-urls';

export type MenuImageMoreEntry = {
  sm: string;
  lg: string;
};

export type ParsedMenuImageUrls = {
  sizes: ImageUrlsMap;
  more: MenuImageMoreEntry[];
};

const SIZE_KEY = /^\d+$/;

function isMenuImageMoreEntry(value: unknown): value is MenuImageMoreEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return Boolean(String(row.sm ?? '').trim() && String(row.lg ?? '').trim());
}

function parseMore(value: unknown): MenuImageMoreEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isMenuImageMoreEntry)
    .map((row) => ({
      sm: String((row as MenuImageMoreEntry).sm).trim(),
      lg: String((row as MenuImageMoreEntry).lg).trim(),
    }));
}

export function parseMenuImageUrls(value: unknown): ParsedMenuImageUrls {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { sizes: {}, more: [] };
  }

  const raw = value as Record<string, unknown>;
  const more = parseMore(raw.more);

  const sizes = Object.entries(raw).reduce<ImageUrlsMap>((acc, [key, url]) => {
    if (key === 'more' || !SIZE_KEY.test(key)) return acc;
    const trimmed = String(url ?? '').trim();
    if (trimmed) acc[key] = trimmed;
    return acc;
  }, {});

  return { sizes, more };
}

export function serializeMenuImageUrls(
  sizes: ImageUrlsMap,
  more: MenuImageMoreEntry[],
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...sizes };
  if (more.length > 0) {
    payload.more = more;
  }
  return payload;
}

export function previewFromParsedMenuImages(
  parsed: ParsedMenuImageUrls,
  preferredSizes: number[] = [1024, 1920, 512, 256],
): string | null {
  for (const size of preferredSizes) {
    const url = parsed.sizes[String(size)]?.trim();
    if (url) return url;
  }
  const fallback = Object.values(parsed.sizes).find((url) => url?.trim());
  return fallback?.trim() ?? null;
}
