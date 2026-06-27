"use client";

import { Providers } from "@/components/providers";
import type { SiteContentSnapshot, StoreLocation } from "@/types";
import type { ReactNode } from "react";

type SiteChromeProvidersProps = {
  children: ReactNode;
  siteContent: SiteContentSnapshot;
  storeLocations: StoreLocation[];
};

export default function SiteChromeProviders({
  children,
  siteContent,
  storeLocations,
}: SiteChromeProvidersProps) {
  return (
    <Providers siteContent={siteContent} storeLocations={storeLocations}>
      {children}
    </Providers>
  );
}
