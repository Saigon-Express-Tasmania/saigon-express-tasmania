/** Primary public site domain (used for SEO metadata and Open Graph). */
export const SITE_DOMAIN = "saigonexpress.com.au";

/** Canonical production origin for metadata, sitemaps, and structured data. */
export const CANONICAL_SITE_ORIGIN = `https://${SITE_DOMAIN}`;

/** Runtime site origin for share links and SSR-safe URLs (env override allowed). */
export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? CANONICAL_SITE_ORIGIN;
