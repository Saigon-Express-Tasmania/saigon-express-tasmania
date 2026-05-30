export type ImageUrlsMap = Record<string, string>;

export function normalizeImageUrls(value: unknown): ImageUrlsMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.entries(value as Record<string, unknown>).reduce<ImageUrlsMap>(
    (acc, [key, url]) => {
      const trimmed = String(url ?? '').trim();
      if (trimmed) acc[key] = trimmed;
      return acc;
    },
    {},
  );
}

export function previewFromImageUrls(
  urls: ImageUrlsMap,
  preferredSizes: number[] = [1024, 1920, 512, 256],
): string | null {
  for (const size of preferredSizes) {
    const url = urls[String(size)]?.trim();
    if (url) return url;
  }
  const fallback = Object.values(urls).find((url) => url?.trim());
  return fallback?.trim() ?? null;
}
