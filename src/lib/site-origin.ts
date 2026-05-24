/** Canonical site origin for share links and SSR-safe URLs. */
export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://saigonexpresstasmania.com";
