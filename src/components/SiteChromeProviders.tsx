"use client";

import { Providers } from "@/components/providers";
import type { SiteContentSnapshot, StoreLocation } from "@/types";
import type { WholesaleCartConfig } from "@/lib/wholesale-page";
import type { ReactNode } from "react";

type SiteChromeProvidersProps = {
  children: ReactNode;
  siteContent: SiteContentSnapshot;
  storeLocations: StoreLocation[];
  wholesaleCartConfig: WholesaleCartConfig;
};

export default function SiteChromeProviders({
  children,
  siteContent,
  storeLocations,
  wholesaleCartConfig,
}: SiteChromeProvidersProps) {
  return (
    <Providers
      siteContent={siteContent}
      storeLocations={storeLocations}
      wholesaleCartConfig={wholesaleCartConfig}
    >
      {children}
    </Providers>
  );
}
