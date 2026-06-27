import SiteChromeProviders from "@/components/SiteChromeProviders";
import { getSiteContentSnapshot } from "@/lib/supabase/site-content";
import { getStoreLocations } from "@/lib/supabase/store-locations";
import type { ReactNode } from "react";

type SiteChromeProvidersLoaderProps = {
  children: ReactNode;
};

export default async function SiteChromeProvidersLoader({
  children,
}: SiteChromeProvidersLoaderProps) {
  const [siteContent, storeLocations] = await Promise.all([
    getSiteContentSnapshot(),
    getStoreLocations(),
  ]);

  return (
    <SiteChromeProviders
      siteContent={siteContent}
      storeLocations={storeLocations}
    >
      {children}
    </SiteChromeProviders>
  );
}
