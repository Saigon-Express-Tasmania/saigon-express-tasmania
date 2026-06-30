const DEFAULT_SITE_URL = "https://saigonexpress.com.au";

/** Resolve a site-relative asset path using the configured public site URL. */
export function resolveSiteAssetUrl(
  url: string | null | undefined,
  siteUrl?: string | null,
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = (siteUrl?.trim() || DEFAULT_SITE_URL).replace(/\/$/, "");
  if (trimmed.startsWith("/")) return `${base}${trimmed}`;
  return `${base}/${trimmed.replace(/^\//, "")}`;
}

/**
 * Resolve an asset URL for the public Next.js app.
 * Root-relative paths (e.g. /images/logo.svg) are served from this site as-is.
 */
export function resolvePublicAssetUrl(
  url: string | null | undefined,
  siteUrl?: string | null,
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return resolveSiteAssetUrl(trimmed, siteUrl);
}
