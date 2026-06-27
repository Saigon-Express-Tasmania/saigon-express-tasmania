/**
 * Default ISR/data-cache revalidation interval (in seconds).
 * 1 hour.
 */
import type { FoodContent } from "@/types/FoodContent";

export const SHORT_REVALIDATE_SECONDS = 60 * 60;

/** Wholesale daily inventory snapshot (shop + cart caps). */
export const WHOLESALE_INVENTORY_REVALIDATE_SECONDS =
  process.env.NODE_ENV === "production" ? 60 : 1;

/** Fallback when `minimum_wholesale_order_value` is missing or invalid. */
export const DEFAULT_MINIMUM_WHOLESALE_ORDER_VALUE = 300;

/** Fallback when `gst_tax_rate` is missing or invalid (10% Australian GST). */
export const DEFAULT_GST_TAX_RATE = 0.1;

/** Default when `is_gst_inclusive` is missing from settings. */
export const DEFAULT_IS_GST_INCLUSIVE = true;

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
  productCustomizations: "product-customizations",
  promotions: "promotions",
  cateringPacks: "catering-packs",
  storeLocations: "store-locations",
  deliveryCities: "delivery-cities",
  wholesaleProducts: "wholesale-products",
  wholesaleInventory: "wholesale-inventory",
  wholesaleTiers: "wholesale-tiers",
  blogPosts: "blog-posts",
  jobListings: "job-listings",
  settings: "settings",
  localization: "localization",
} as const;

export const REVALIDATE_TAG_LIST = Object.values(CACHE_TAGS);

export const ENABLE_TAWT_TO = false;
export const ENABLE_FACEBOOK_MESSAGE = true;
export const ENABLE_WHATSAPP_MESSAGE = true;

export const FOOD_CONTENT_LABEL_VISIBILITY: Record<
  keyof FoodContent,
  string | false
> = {
  contains_pork: 'pork',
  contains_beef: 'beef',
  contains_chicken: false,
  contains_duck: false,
  contains_goat: false,
  contains_game: false,
  contains_turkey: false,
  contains_lamb: false,
  contains_shellfish: false,
  contains_fish: false,
  contains_crustaceans: false,
  contains_molluscs: false,
  contains_peanuts: 'nuts',
  contains_tree_nuts: 'nuts',
  contains_almonds: 'nuts',
  contains_cashews: 'nuts',
  contains_walnuts: 'nuts',
  contains_soy: false,
  contains_wheat: false,
  contains_gluten: false,
  contains_eggs: 'eggs',
  contains_dairy: 'dairy',
  contains_milk: 'dairy',
  contains_cheese: 'dairy',
  contains_sesame: false,
  contains_mustard: false,
  contains_celery: false,
  contains_lupin: false,
  contains_sulphites: false,
  is_gluten_free: 'gluten-free',
  is_dairy_free: 'lactose-free',
  is_lactose_free: 'lactose-free',
  is_vegan: 'vegan',
  is_vegetarian: 'vegan',
  is_halal: false,
  is_kosher: false,
  is_non_gmo: 'non-gmo',
  is_organic: 'organic',
  is_sugar_free: 'sugar-free',
  is_low_sodium: 'low-sodium',
  is_keto_friendly: 'keto-friendly',
  is_spicy: 'spicy',
  contains_alcohol: 'alcohol',
  contains_caffeine: 'caffeine',
  is_raw: 'raw',
  is_frozen: false,
  is_ready_to_eat: false,
};