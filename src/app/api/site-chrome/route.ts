import { CACHE_TAGS, SHORT_REVALIDATE_SECONDS } from "@/config";
import { getSiteContentSnapshot } from "@/lib/supabase/site-content";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";
import { NextResponse } from "next/server";

export async function GET() {
  const [siteContent, storeLocations] = await Promise.all([
    getSiteContentSnapshot(),
    getActiveStoreLocations(),
  ]);

  return NextResponse.json(
    { siteContent, storeLocations },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${SHORT_REVALIDATE_SECONDS}, stale-while-revalidate=${SHORT_REVALIDATE_SECONDS}`,
        "CDN-Cache-Control": `public, s-maxage=${SHORT_REVALIDATE_SECONDS}`,
        "Vary": "Accept-Encoding",
        "X-Cache-Tags": `${CACHE_TAGS.settings},${CACHE_TAGS.localization},${CACHE_TAGS.storeLocations}`,
      },
    },
  );
}
