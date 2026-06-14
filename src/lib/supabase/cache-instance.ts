/**
 * Busts Next.js `unstable_cache` entries on each server process start (dev restart,
 * deploy, etc.). Include in cache key parts alongside stable tags.
 */
export const SERVER_CACHE_INSTANCE_ID = String(Date.now());
