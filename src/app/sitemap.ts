import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/config/localize";
import { menuItemDetailPath } from "@/lib/menu-item-routes";
import { getMenuItems } from "@/lib/supabase/menu";
import { SITE_ORIGIN } from "@/lib/site-origin";

const STATIC_PATHS = [
  "",
  "/menu",
  "/stores",
  "/contact",
  "/faq",
  "/our-story",
  "/catering",
  "/promotions",
  "/franchise",
  "/careers",
  "/wholesale/shop",
  "/get-the-app",
] as const;

function localizedPath(path: string, locale: string): string {
  if (locale === DEFAULT_LOCALE) {
    return path || "/";
  }
  return `/${locale}${path}`;
}

function toSitemapEntry(path: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_ORIGIN}${path === "/" ? "" : path}`,
    lastModified: new Date(),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const menuItems = await getMenuItems();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of SUPPORTED_LOCALES) {
    for (const path of STATIC_PATHS) {
      entries.push(toSitemapEntry(localizedPath(path, locale)));
    }

    for (const item of menuItems) {
      entries.push(toSitemapEntry(menuItemDetailPath(item, locale)));
    }
  }

  return entries;
}
