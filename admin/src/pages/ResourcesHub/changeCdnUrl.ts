/**
 * Strip trailing slashes so base URLs join with the path on exactly one "/".
 * Example:
 *   old: .../saigon-express-tasmania
 *   new: https://cdn.saigonexpresstasmania.com.au/
 *   value: .../saigon-express-tasmania/folder/file.pdf
 *   → https://cdn.saigonexpresstasmania.com.au/folder/file.pdf
 */
export function normalizeCdnBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function replaceCdnUrlPrefix(
  value: string | null | undefined,
  oldUrl: string,
  newUrl: string,
): string | null {
  if (value == null || value === '') return value ?? null;

  const oldBase = normalizeCdnBaseUrl(oldUrl);
  const newBase = normalizeCdnBaseUrl(newUrl);
  if (!oldBase || oldBase === newBase) return value;
  if (!value.includes(oldBase)) return value;

  return value.split(oldBase).join(newBase);
}
