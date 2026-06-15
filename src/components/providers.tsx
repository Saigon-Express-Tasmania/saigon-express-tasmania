"use client";

import dynamic from "next/dynamic";
import AppChrome from "@/components/AppChrome";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { WholesaleCartProvider } from "@/contexts/WholesaleCartContext";
import { WholesaleInventoryProvider } from "@/contexts/WholesaleInventoryContext";
import WholesaleCartInventorySync from "@/components/WholesaleCartInventorySync";
import { SiteContentProvider } from "@/contexts/SiteContentContext";
import { SupabaseProvider } from "@/contexts/SupabaseContext";
import { SupabaseStorageProvider } from "@/contexts/SupabaseStorageContext";
import { setClientStoreLocations } from "@/lib/supabase/store-locations-client";
import type { WholesaleCartConfig } from "@/lib/wholesale-page";
import type { SiteContentSnapshot, StoreLocation } from "@/types";

const WholesaleShoppingCart = dynamic(
  () => import("@/components/WholesaleShoppingCart"),
  { ssr: false },
);

interface ProvidersProps {
  children: React.ReactNode;
  siteContent: SiteContentSnapshot;
  storeLocations: StoreLocation[];
  wholesaleCartConfig: WholesaleCartConfig;
}

export function Providers({
  children,
  siteContent,
  storeLocations,
  wholesaleCartConfig,
}: ProvidersProps) {
  setClientStoreLocations(storeLocations);

  return (
    <SiteContentProvider initialData={siteContent}>
      <SupabaseProvider>
        <SupabaseStorageProvider>
          <ThemeProvider defaultTheme="light">
            <CartProvider>
              <WholesaleInventoryProvider>
                <WholesaleCartProvider
                  pricingTiers={wholesaleCartConfig.pricingTiers}
                  minimumOrderValue={
                    wholesaleCartConfig.minimumWholesaleOrderValue
                  }
                >
                  <WholesaleCartInventorySync />
                  <TooltipProvider>
                    <AppChrome storeLocations={storeLocations}>
                      {children}
                    </AppChrome>
                    <WholesaleShoppingCart storeLocations={storeLocations} />
                    <Toaster />
                  </TooltipProvider>
                </WholesaleCartProvider>
              </WholesaleInventoryProvider>
            </CartProvider>
          </ThemeProvider>
        </SupabaseStorageProvider>
      </SupabaseProvider>
    </SiteContentProvider>
  );
}
