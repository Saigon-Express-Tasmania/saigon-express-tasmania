import type { Metadata } from "next";
import { CANONICAL_SITE_ORIGIN } from "@/lib/site-origin";

export const SEO_BRAND = "Saigon Express Tasmania";
export const SEO_SITE_NAME = "Saigon Express";
export const SEO_TITLE_TEMPLATE = `%s | ${SEO_BRAND}`;
export const SEO_CONTACT_EMAIL = "info@saigonexpress.com.au";
export const SEO_CONTACT_PHONE = "0416036016";

type OgImageConfig = {
  url: string;
  alt: string;
  type: string;
  width?: number;
  height?: number;
};

type PageSeoConfig = {
  title: string;
  description: string;
  keywords: readonly string[];
  path: "/" | `/${string}`;
  image: OgImageConfig;
};

const OG_LOCALE = "en_AU";
const OG_ALTERNATE_LOCALES = ["vi_AU"] as const;

const OG_IMAGES = {
  home: {
    url: "/manus-storage/saigo_express__hero_Native_5d9afb69.webp",
    alt: "Authentic Vietnamese street food at Saigon Express Tasmania",
    type: "image/webp",
  },
  menu: {
    url: "/manus-storage/menu__hero.jpg",
    alt: "Order Vietnamese food online from Saigon Express Tasmania",
    type: "image/jpeg",
  },
  catering: {
    url: "/manus-storage/catering-hero-counter_71eb7271.jpg",
    alt: "Saigon Express Vietnamese event catering in Tasmania",
    type: "image/jpeg",
  },
  wholesale: {
    url: "/manus-storage/wholesale__hero.jpg",
    alt: "Saigon Express wholesale Vietnamese food products for Tasmania businesses",
    type: "image/jpeg",
  },
  franchise: {
    url: "/manus-storage/franchise__hero.jpg",
    alt: "Saigon Express restaurant franchise opportunities in Tasmania",
    type: "image/jpeg",
  },
} as const satisfies Record<string, OgImageConfig>;

const pageSeo = {
  home: {
    title: "Authentic Vietnamese Food",
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
    path: "/",
    image: OG_IMAGES.home,
  },
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
    path: "/menu",
    image: OG_IMAGES.menu,
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
    path: "/catering",
    image: OG_IMAGES.catering,
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
    path: "/wholesale",
    image: OG_IMAGES.wholesale,
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
    path: "/franchise",
    image: OG_IMAGES.franchise,
  },
} as const satisfies Record<string, PageSeoConfig>;

export type SeoPageKey = keyof typeof pageSeo;

function pageUrl(path: PageSeoConfig["path"]): string {
  return path === "/" ? CANONICAL_SITE_ORIGIN : `${CANONICAL_SITE_ORIGIN}${path}`;
}

function localizedAlternates(path: PageSeoConfig["path"]) {
  const viPath = path === "/" ? "/vi" : `/vi${path}`;

  return {
    canonical: pageUrl(path),
    languages: {
      en: pageUrl(path),
      vi: `${CANONICAL_SITE_ORIGIN}${viPath}`,
    },
  };
}

function fullTitle(config: PageSeoConfig): string {
  if (config.path === "/") {
    return `${SEO_BRAND} | ${config.title}`;
  }

  return `${config.title} | ${SEO_BRAND}`;
}

function buildOpenGraph(config: PageSeoConfig): NonNullable<Metadata["openGraph"]> {
  const title = fullTitle(config);

  return {
    type: "website",
    determiner: "auto",
    title,
    description: config.description,
    url: pageUrl(config.path),
    siteName: SEO_BRAND,
    locale: OG_LOCALE,
    alternateLocale: [...OG_ALTERNATE_LOCALES],
    countryName: "Australia",
    emails: [SEO_CONTACT_EMAIL],
    phoneNumbers: [SEO_CONTACT_PHONE],
    images: [
      {
        url: config.image.url,
        alt: config.image.alt,
        type: config.image.type,
        ...(config.image.width ? { width: config.image.width } : {}),
        ...(config.image.height ? { height: config.image.height } : {}),
      },
    ],
  };
}

function buildTwitter(config: PageSeoConfig): NonNullable<Metadata["twitter"]> {
  const title = fullTitle(config);

  return {
    card: "summary_large_image",
    title,
    description: config.description,
    images: [
      {
        url: config.image.url,
        alt: config.image.alt,
      },
    ],
  };
}

function buildMetadata(config: PageSeoConfig, options?: { isHome?: boolean }): Metadata {
  const social = {
    openGraph: buildOpenGraph(config),
    twitter: buildTwitter(config),
  };

  if (options?.isHome) {
    return {
      title: {
        default: fullTitle(config),
        template: SEO_TITLE_TEMPLATE,
      },
      description: config.description,
      keywords: [...config.keywords],
      alternates: localizedAlternates(config.path),
      creator: SEO_BRAND,
      publisher: SEO_BRAND,
      applicationName: SEO_SITE_NAME,
      authors: [{ name: SEO_BRAND, url: CANONICAL_SITE_ORIGIN }],
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      ...social,
    };
  }

  return {
    title: config.title,
    description: config.description,
    keywords: [...config.keywords],
    alternates: localizedAlternates(config.path),
    creator: SEO_BRAND,
    publisher: SEO_BRAND,
    authors: [{ name: SEO_BRAND, url: CANONICAL_SITE_ORIGIN }],
    ...social,
  };
}

/** Shared root layout defaults (homepage). */
export const rootLayoutMetadata: Metadata = {
  metadataBase: new URL(CANONICAL_SITE_ORIGIN),
  ...buildMetadata(pageSeo.home, { isHome: true }),
};

export function pageMetadata(page: Exclude<SeoPageKey, "home">): Metadata {
  return buildMetadata(pageSeo[page]);
}
