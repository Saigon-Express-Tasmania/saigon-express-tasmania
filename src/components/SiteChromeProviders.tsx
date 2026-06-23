"use client";

import { Providers } from "@/components/providers";
import type { SelfDeliveryFee } from "@/lib/self-delivery-fee";
import type { DeliveryCity, SiteContentSnapshot, StoreLocation } from "@/types";
import type { WholesaleCartConfig } from "@/lib/wholesale-page";
import type { ReactNode } from "react";

type SiteChromeProvidersProps = {
  children: ReactNode;
  siteContent: SiteContentSnapshot;
  storeLocations: StoreLocation[];
  deliveryCities: DeliveryCity[];
  wholesaleCartConfig: WholesaleCartConfig;
  selfDeliveryFee: SelfDeliveryFee;
  selfDeliveryOrigin: string;
};

export default function SiteChromeProviders({
  children,
  siteContent,
  storeLocations,
  deliveryCities,
  wholesaleCartConfig,
  selfDeliveryFee,
  selfDeliveryOrigin,
}: SiteChromeProvidersProps) {
  return (
    <Providers
      siteContent={siteContent}
      storeLocations={storeLocations}
      deliveryCities={deliveryCities}
      wholesaleCartConfig={wholesaleCartConfig}
      selfDeliveryFee={selfDeliveryFee}
      selfDeliveryOrigin={selfDeliveryOrigin}
    >
      {children}
    </Providers>
  );
}
