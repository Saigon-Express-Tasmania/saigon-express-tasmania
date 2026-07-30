import { ENV } from '@/constants';

/** Strip leading slashes from a storage object path. */
export function normalizeStoragePath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

function pathAfterBaseUrl(publicUrl: string, baseUrl: string): string | null {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!base) return null;

  const trimmed = publicUrl.trim();
  if (!trimmed.startsWith(base)) return null;

  const rest = trimmed.slice(base.length).replace(/^\/+/, '');
  if (!rest) return null;

  try {
    return normalizeStoragePath(decodeURIComponent(rest.split('?')[0] ?? rest));
  } catch {
    return normalizeStoragePath((rest.split('?')[0] ?? rest));
  }
}

/**
 * Extract the object path inside a bucket from a public object URL
 * (R2 custom domain / public URL, or legacy Supabase storage URLs).
 */
export function storagePathFromPublicUrl(
  publicUrl: string,
  bucket: string,
): string | null {
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;

  const fromR2 = pathAfterBaseUrl(trimmed, ENV.r2PublicUrl ?? '');
  if (fromR2) return fromR2;

  if (!bucket) return null;

  const encodedBucket = encodeURIComponent(bucket);
  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/public/${encodedBucket}/`,
    `/object/public/${bucket}/`,
    `/object/public/${encodedBucket}/`,
  ];

  for (const marker of markers) {
    const index = trimmed.indexOf(marker);
    if (index === -1) continue;
    try {
      return normalizeStoragePath(
        decodeURIComponent(trimmed.slice(index + marker.length).split('?')[0] ?? ''),
      );
    } catch {
      return normalizeStoragePath(
        trimmed.slice(index + marker.length).split('?')[0] ?? '',
      );
    }
  }

  return null;
}

export function resolveStorageObjectPath({
  path,
  publicUrl,
  bucket,
}: {
  path?: string | null;
  publicUrl?: string | null;
  bucket: string;
}): string | null {
  const normalizedPath = normalizeStoragePath(path ?? '');
  if (normalizedPath) return normalizedPath;

  if (!publicUrl) return null;
  return storagePathFromPublicUrl(publicUrl, bucket);
}
