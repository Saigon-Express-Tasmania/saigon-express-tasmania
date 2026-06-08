/** Strip leading slashes from a storage object path. */
export function normalizeStoragePath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

/**
 * Extract the object path inside a bucket from a Supabase public object URL.
 */
export function storagePathFromPublicUrl(
  publicUrl: string,
  bucket: string,
): string | null {
  const trimmed = publicUrl.trim();
  if (!trimmed || !bucket) return null;

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
        decodeURIComponent(trimmed.slice(index + marker.length)),
      );
    } catch {
      return normalizeStoragePath(trimmed.slice(index + marker.length));
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
