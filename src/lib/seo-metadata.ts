import type { Metadata } from "next";

export const SEO_BRAND = "Saigon Express Tasmania";

export const SEO_TITLE_TEMPLATE = `%s | ${SEO_BRAND}`;

/** Shared root layout defaults (homepage). */
export const rootLayoutMetadata: Metadata = {
  title: {
    default: `${SEO_BRAND} | Authentic Vietnamese Food`,
    template: SEO_TITLE_TEMPLATE,
  },
  description:
    "Taste Tasmania's premier authentic Vietnamese food at Saigon Express. Discover fresh Pho, wholesome plant-based dishes, and vibrant flavours. Order online!",
  keywords: [
    "Saigon Express Tasmania",
    "authentic Vietnamese food Hobart",
    "Vietnamese restaurant Kingston",
    "Sorell Vietnamese takeaway",
    "fresh pho Tasmania",
    "banh mi Hobart",
    "specific authenticity dining",
    "plant-based Vietnamese food",
    "health-conscious takeout",
    "bold flavour experiences",
    "wholesome vegan options",
  ],
};

const pageSeo = {
  menu: {
    title: "Order Vietnamese Food Online",
    description:
      "Craving bold Vietnamese flavours? Order Saigon Express online for quick pickup or delivery across Tasmania. Enjoy authentic, value-driven meals in every bite.",
    keywords: [
      "order Vietnamese food online",
      "quick lunch Hobart",
      "healthy takeout Tasmania",
      "fresh rice paper rolls",
      "value-driven dining",
      "Vietnamese delivery",
      "Saigon Express Tasmania",
      "authentic Vietnamese food Hobart",
      "plant-based Vietnamese food",
      "health-conscious takeout",
    ],
  },
  catering: {
    title: "Vietnamese Event Catering Tasmania",
    description:
      "Elevate your next Tasmanian event with Saigon Express catering. We offer authentic Vietnamese party packs, fresh rolls, and custom menus for any occasion.",
    keywords: [
      "Vietnamese catering Tasmania",
      "corporate event catering Hobart",
      "party food platters",
      "tailored catering packs",
      "fresh catering menus",
      "Saigon Express Tasmania",
      "authentic Vietnamese food Hobart",
    ],
  },
  wholesale: {
    title: "Wholesale & Franchise",
    description:
      "Join the Saigon Express family! Explore our Tasmanian restaurant franchise opportunities and premium Vietnamese wholesale food products for your business.",
    keywords: [
      "Vietnamese food wholesale",
      "wholesale Asian ingredients",
      "Saigon Express Tasmania",
      "hospitality franchise Australia",
      "restaurant franchise opportunities Tasmania",
    ],
  },
  franchise: {
    title: "Restaurant Franchise Opportunities",
    description:
      "Join the Saigon Express family! Explore our Tasmanian restaurant franchise opportunities and bring authentic Vietnamese street food to your community.",
    keywords: [
      "restaurant franchise opportunities Tasmania",
      "Saigon Express franchise",
      "hospitality franchise Australia",
      "authentic Vietnamese food Hobart",
      "Saigon Express Tasmania",
    ],
  },
} as const;

export type SeoPageKey = keyof typeof pageSeo;

export function pageMetadata(page: SeoPageKey): Metadata {
  const { title, description, keywords } = pageSeo[page];
  return { title, description, keywords: [...keywords] };
}
