"use client";

import dynamic from "next/dynamic";
import MainFooter from "@/components/MainFooter";
import MainHeader from "@/components/MainHeader";
import { shouldHideMainHeader } from "@/lib/site-chrome";
import type { StoreLocation } from "@/types";
import { usePathname } from "next/navigation";

const CartDrawer = dynamic(() => import("@/components/CartDrawer"), {
  ssr: false,
});

const FloatingWidgets = dynamic(
  () =>
    import("@/components/FloatingWidgets").then((module) => ({
      default: module.FloatingWidgets,
    })),
  { ssr: false },
);

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
