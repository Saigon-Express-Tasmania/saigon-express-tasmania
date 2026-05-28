/**
 * Default ISR/data-cache revalidation interval (in seconds).
 * 1 hour.
 */
export const SHORT_REVALIDATE_SECONDS = 60 * 60;

/**
 * Long ISR/data-cache revalidation interval (in seconds).
 * 1 day.
 */
export const LONG_REVALIDATE_SECONDS = 24 * 60 * 60;

/**
 * Cache tags used by Next.js data cache entries.
 */
export const CACHE_TAGS = {
  menu: "menu",
  categories: "categories",
  promotions: "promotions",
  storeLocations: "store-locations",
  wholesaleProducts: "wholesale-products",
  settings: "settings",
  localization: "localization",
} as const;

export const REVALIDATE_TAG_LIST = Object.values(CACHE_TAGS);
