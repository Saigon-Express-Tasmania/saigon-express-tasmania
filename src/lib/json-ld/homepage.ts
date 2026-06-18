import { LOGO_URL } from "@/lib/site-images";
import { SITE_ORIGIN } from "@/lib/site-origin";
import {
  SEO_BRAND,
  SEO_CONTACT_EMAIL,
  SEO_CONTACT_PHONE,
  SEO_SITE_NAME,
} from "@/lib/seo-metadata";
import type { StoreLocation } from "@/types";

const ORG_ID = `${SITE_ORIGIN}/#organization`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

const ORGANIZATION_ADDRESS = {
  "@type": "PostalAddress" as const,
  streetAddress: "Level 2, 86 Collins St",
  addressLocality: "Hobart",
  addressRegion: "TAS",
  postalCode: "7000",
  addressCountry: "AU",
};

const SOCIAL_PROFILES = [
  "https://www.facebook.com/saigonexpresstasmania",
  "https://www.instagram.com/saigonexpresstas",
] as const;

const SCHEMA_DAYS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const HOME_HERO_IMAGE = `${SITE_ORIGIN}/manus-storage/saigo_express__hero_Native_5d9afb69.webp`;

type PostalAddress = {
  "@type": "PostalAddress";
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode?: string;
  addressCountry: string;
};

type OpeningHoursSpecification = {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string[];
  opens: string;
  closes: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function to24Hour(time: string): string {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return time.trim();
  }

  let hour = Number.parseInt(match[1] ?? "0", 10);
  const minute = match[2] ?? "00";
  const period = (match[3] ?? "AM").toUpperCase();

  if (period === "PM" && hour !== 12) {
    hour += 12;
  }
  if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

function parseTimeRange(range: string): { opens: string; closes: string } | null {
  const [opensRaw, closesRaw] = range.split("-").map((part) => part.trim());
  if (!opensRaw || !closesRaw) {
    return null;
  }

  return {
    opens: to24Hour(opensRaw),
    closes: to24Hour(closesRaw),
  };
}

function parseOpeningHours(hours: string | null): OpeningHoursSpecification[] {
  if (!hours) {
    return [];
  }

  try {
    const parsed = JSON.parse(hours) as Record<string, string>;
    const grouped = new Map<string, string[]>();

    for (const [dayKey, range] of Object.entries(parsed)) {
      const dayOfWeek = SCHEMA_DAYS[dayKey];
      if (!dayOfWeek || !range?.trim()) {
        continue;
      }

      const days = grouped.get(range) ?? [];
      days.push(dayOfWeek);
      grouped.set(range, days);
    }

    const specifications: OpeningHoursSpecification[] = [];

    for (const [range, dayOfWeek] of grouped.entries()) {
      const times = parseTimeRange(range);
      if (!times) {
        continue;
      }

      specifications.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek,
        opens: times.opens,
        closes: times.closes,
      });
    }

    return specifications;
  } catch {
    return [];
  }
}

function buildPostalAddress(
  address: string,
  suburb: string | null,
): PostalAddress {
  const postalCode =
    address.match(/\bTAS\s*(\d{4})\b/i)?.[1] ??
    address.match(/\b(\d{4})\b$/)?.[1];

  let streetAddress = address.trim();

  if (suburb && postalCode) {
    const suffix = new RegExp(
      `,\\s*${escapeRegExp(suburb)}\\s*TAS\\s*${postalCode}\\s*$`,
      "i",
    );
    streetAddress = address.replace(suffix, "").trim();
  }

  return {
    "@type": "PostalAddress",
    streetAddress,
    addressLocality: suburb ?? "Tasmania",
    addressRegion: "TAS",
    ...(postalCode ? { postalCode } : {}),
    addressCountry: "AU",
  };
}

function displayLocationName(name: string): string {
  if (name.startsWith("SGE ")) {
    return `Saigon Express ${name.slice(4)}`;
  }

  return name;
}

function buildOrganizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SEO_SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}${LOGO_URL}`,
    image: HOME_HERO_IMAGE,
    description:
      "Tasmania's premier authentic Vietnamese food franchise, offering dine-in, online ordering, catering, and wholesale products.",
    telephone: SEO_CONTACT_PHONE,
    email: SEO_CONTACT_EMAIL,
    address: ORGANIZATION_ADDRESS,
    sameAs: [...SOCIAL_PROFILES],
    offers: [
      {
        "@type": "Offer",
        name: "Restaurant Franchise Opportunities",
        description:
          "Join the Saigon Express family with our Tasmanian restaurant franchise portal.",
        url: `${SITE_ORIGIN}/franchise`,
      },
      {
        "@type": "Offer",
        name: "Vietnamese Food Wholesale",
        description:
          "Premium wholesale Asian ingredients and Vietnamese food products.",
        url: `${SITE_ORIGIN}/wholesale`,
      },
      {
        "@type": "Offer",
        name: "Vietnamese Event Catering",
        description:
          "Authentic Vietnamese party packs, fresh rolls, and custom catering menus.",
        url: `${SITE_ORIGIN}/catering`,
      },
    ],
  };
}

function buildWebsiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_ORIGIN}/`,
    name: SEO_BRAND,
    inLanguage: "en-AU",
    publisher: {
      "@id": ORG_ID,
    },
    potentialAction: {
      "@type": "OrderAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_ORIGIN}/menu`,
        inLanguage: "en",
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/IOSPlatform",
          "http://schema.org/AndroidPlatform",
        ],
      },
      deliveryMethod: [
        "http://purl.org/goodrelations/v1#DeliveryModePickUp",
        "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
      ],
    },
  };
}

function buildRestaurantNode(location: StoreLocation) {
  const openingHoursSpecification = parseOpeningHours(location.hours);
  const postalAddress = buildPostalAddress(location.address, location.suburb);

  return {
    "@type": "Restaurant",
    "@id": `${SITE_ORIGIN}/#location-${location.id}`,
    name: displayLocationName(location.name),
    image: HOME_HERO_IMAGE,
    url: `${SITE_ORIGIN}/stores`,
    parentOrganization: {
      "@id": ORG_ID,
    },
    servesCuisine: ["Vietnamese", "Asian", "Plant-based"],
    menu: `${SITE_ORIGIN}/menu`,
    ...(location.phone ? { telephone: location.phone } : {}),
    ...(location.email ? { email: location.email } : {}),
    address: postalAddress,
    ...(location.lat && location.lng
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: location.lat,
            longitude: location.lng,
          },
        }
      : {}),
    ...(openingHoursSpecification.length > 0
      ? { openingHoursSpecification }
      : {}),
  };
}

export function buildHomeJsonLd(storeLocations: StoreLocation[]) {
  const restaurants = storeLocations
    .filter((location) => location.isActive)
    .map(buildRestaurantNode);

  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationNode(),
      buildWebsiteNode(),
      ...restaurants,
    ],
  };
}

export function serializeHomeJsonLd(storeLocations: StoreLocation[]): string {
  return JSON.stringify(buildHomeJsonLd(storeLocations));
}
