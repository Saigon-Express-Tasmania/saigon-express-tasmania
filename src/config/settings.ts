/**
 * Default ISR/data-cache revalidation interval (in seconds).
 * 1 hour.
 */
export const REVALIDATE_SECONDS = 60 * 60;

/**
 * Cache tags used by Next.js data cache entries.
 */
export const CACHE_TAGS = {
  menu: "menu",
  promotions: "promotions",
  storeLocations: "store-locations",
  wholesaleProducts: "wholesale-products",
} as const;

export const REVALIDATE_TAG_LIST = Object.values(CACHE_TAGS);
