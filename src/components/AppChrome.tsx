"use client";

import ClientOnly from "@/components/ClientOnly";
import CartDrawer from "@/components/CartDrawer";
import { FloatingWidgets } from "@/components/FloatingWidgets";
import MainFooter from "@/components/MainFooter";
import MainHeader from "@/components/MainHeader";
import { shouldHideMainHeader } from "@/lib/site-chrome";
import { filterActiveStoreLocations } from "@/lib/supabase/store-locations-client";
import type { StoreLocation } from "@/types";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

type AppChromeProps = {
  children: React.ReactNode;
  storeLocations: StoreLocation[];
};

export default function AppChrome({
  children,
  storeLocations,
}: AppChromeProps) {
  const pathname = usePathname();
  const hideDashboardChrome = shouldHideMainHeader(pathname ?? "/");
  const activeStoreLocations = useMemo(
    () => filterActiveStoreLocations(storeLocations),
    [storeLocations],
  );

  return (
    <>
      {!hideDashboardChrome ? (
        <MainHeader storeLocations={activeStoreLocations} />
      ) : null}
      {children}
      <MainFooter />
      <ClientOnly>
        <CartDrawer />
      </ClientOnly>
      {!hideDashboardChrome ? (
        <ClientOnly>
          <FloatingWidgets />
        </ClientOnly>
      ) : null}
    </>
  );
}
