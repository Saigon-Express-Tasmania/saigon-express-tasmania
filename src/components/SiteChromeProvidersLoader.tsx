import SiteChromeProviders from "@/components/SiteChromeProviders";
import { getSiteContentSnapshot } from "@/lib/supabase/site-content";
import { getDeliveryCities } from "@/lib/supabase/delivery-cities";
import { getSelfDeliveryFee, getSelfDeliveryOrigin } from "@/lib/supabase/settings";
import { getStoreLocations } from "@/lib/supabase/store-locations";
import { loadWholesaleCartConfig } from "@/lib/wholesale-page";
import type { ReactNode } from "react";

type SiteChromeProvidersLoaderProps = {
  children: ReactNode;
};

export default async function SiteChromeProvidersLoader({
  children,
}: SiteChromeProvidersLoaderProps) {
  const [siteContent, storeLocations, deliveryCities, wholesaleCartConfig, selfDeliveryFee, selfDeliveryOrigin] =
    await Promise.all([
      getSiteContentSnapshot(),
      getStoreLocations(),
      getDeliveryCities(),
      loadWholesaleCartConfig(),
      getSelfDeliveryFee(),
      getSelfDeliveryOrigin(),
    ]);

  return (
    <SiteChromeProviders
      siteContent={siteContent}
      storeLocations={storeLocations}
      deliveryCities={deliveryCities}
      wholesaleCartConfig={wholesaleCartConfig}
      selfDeliveryFee={selfDeliveryFee}
      selfDeliveryOrigin={selfDeliveryOrigin}
    >
      {children}
    </SiteChromeProviders>
  );
}
