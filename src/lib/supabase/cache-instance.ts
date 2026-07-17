/**
 * Cache invalidation is tag-based via `/api/revalidate` and time-based
 * `revalidate` windows — not boot-time key busting.
 *
 * Previously this module exported a `Date.now()` instance id that was baked
 * into `unstable_cache` keys, which defeated Netlify's durable Data Cache on
 * every serverless cold start. Do not reintroduce boot-busted cache keys.
 */
