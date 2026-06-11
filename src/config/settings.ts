/**
 * Default ISR/data-cache revalidation interval (in seconds).
 * 1 hour.
 */
export const SHORT_REVALIDATE_SECONDS = 60 * 60;

/** Fallback when `minimum_wholesale_order_value` is missing or invalid. */
export const DEFAULT_MINIMUM_WHOLESALE_ORDER_VALUE = 300;

/**
 * Long ISR/data-cache revalidation interval (in seconds).
 * 1 day.
 */
export const LONG_REVALIDATE_SECONDS = 24 * 60 * 60;

/**
 * Blog post detail pages — stable content, revalidate daily.
 */
export const BLOG_POST_DETAIL_REVALIDATE_SECONDS = LONG_REVALIDATE_SECONDS;

/**
 * Cache tags used by Next.js data cache entries.
 */
export const CACHE_TAGS = {
  menu: "menu",
  categories: "categories",
  promotions: "promotions",
  cateringPacks: "catering-packs",
  storeLocations: "store-locations",
  wholesaleProducts: "wholesale-products",
  wholesaleTiers: "wholesale-tiers",
  blogPosts: "blog-posts",
  settings: "settings",
  localization: "localization",
} as const;

export const REVALIDATE_TAG_LIST = Object.values(CACHE_TAGS);
