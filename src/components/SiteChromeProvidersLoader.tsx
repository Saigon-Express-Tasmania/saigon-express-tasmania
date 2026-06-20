import SiteChromeProviders from "@/components/SiteChromeProviders";
import { getSiteContentSnapshot } from "@/lib/supabase/site-content";
import { getStoreLocations } from "@/lib/supabase/store-locations";
import { loadWholesaleCartConfig } from "@/lib/wholesale-page";
import type { ReactNode } from "react";

type SiteChromeProvidersLoaderProps = {
  children: ReactNode;
};

export default async function SiteChromeProvidersLoader({
  children,
}: SiteChromeProvidersLoaderProps) {
  const [siteContent, storeLocations, wholesaleCartConfig] = await Promise.all([
    getSiteContentSnapshot(),
    getStoreLocations(),
    loadWholesaleCartConfig(),
  ]);

  return (
    <SiteChromeProviders
      siteContent={siteContent}
      storeLocations={storeLocations}
      wholesaleCartConfig={wholesaleCartConfig}
    >
      {children}
    </SiteChromeProviders>
  );
}
