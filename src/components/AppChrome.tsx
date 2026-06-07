"use client";

import CartDrawer from "@/components/CartDrawer";
import { FloatingWidgets } from "@/components/FloatingWidgets";
import MainFooter from "@/components/MainFooter";
import MainHeader from "@/components/MainHeader";
import { shouldHideMainHeader } from "@/lib/site-chrome";
import type { StoreLocation } from "@/types";
import { usePathname } from "next/navigation";

type AppChromeProps = {
  children: React.ReactNode;
  storeLocations: StoreLocation[];
  /** Pathname from middleware — used during SSR before client navigation hooks hydrate. */
  initialPathname: string;
};

export default function AppChrome({
  children,
  storeLocations,
  initialPathname,
}: AppChromeProps) {
  const pathname = usePathname();
  const hideDashboardChrome = shouldHideMainHeader(pathname || initialPathname);

  return (
    <>
      {!hideDashboardChrome ? (
        <MainHeader storeLocations={storeLocations} />
      ) : null}
      {children}
      <MainFooter />
      <CartDrawer />
      {!hideDashboardChrome ? <FloatingWidgets /> : null}
    </>
  );
}
