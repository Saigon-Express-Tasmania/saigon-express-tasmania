import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site-origin";

/**
 * https://saigonexpresstasmania.com/robots.txt
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/checkout"],
      },
    ],
    host: SITE_ORIGIN,
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
