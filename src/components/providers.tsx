"use client";

import AppChrome from "@/components/AppChrome";
import CateringGuestLastOrderPanel from "@/components/CateringGuestLastOrderPanel";
import CateringShoppingCart from "@/components/CateringShoppingCart";
import ClientOnly from "@/components/ClientOnly";
import CookieConsent from "@/components/CookieConsent";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import WholesaleCartInventorySync from "@/components/WholesaleCartInventorySync";
import WholesaleShoppingCart from "@/components/WholesaleShoppingCart";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { WholesaleCartProvider } from "@/contexts/WholesaleCartContext";
import { CateringCartProvider } from "@/contexts/CateringCartContext";
import { GuestCateringOrderProvider } from "@/contexts/GuestCateringOrderContext";
import { WholesaleInventoryProvider } from "@/contexts/WholesaleInventoryContext";
import { SiteContentProvider } from "@/contexts/SiteContentContext";
import { SupabaseProvider } from "@/contexts/SupabaseContext";
import { SupabaseStorageProvider } from "@/contexts/SupabaseStorageContext";
import { setClientStoreLocations } from "@/lib/supabase/store-locations-client";
import type { WholesaleCartConfig } from "@/lib/wholesale-page";
import type { SiteContentSnapshot, StoreLocation } from "@/types";

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
                  <CateringCartProvider>
                    <GuestCateringOrderProvider>
                      <WholesaleCartInventorySync />
                      <TooltipProvider>
                        <AppChrome storeLocations={storeLocations}>
                          {children}
                        </AppChrome>
                        <ClientOnly>
                          <WholesaleShoppingCart
                            storeLocations={storeLocations}
                          />
                        </ClientOnly>
                        <ClientOnly>
                          <CateringShoppingCart />
                        </ClientOnly>
                        <ClientOnly>
                          <CateringGuestLastOrderPanel />
                        </ClientOnly>
                        <ClientOnly>
                          <CookieConsent />
                        </ClientOnly>
                        <Toaster />
                      </TooltipProvider>
                    </GuestCateringOrderProvider>
                  </CateringCartProvider>
                </WholesaleCartProvider>
              </WholesaleInventoryProvider>
            </CartProvider>
          </ThemeProvider>
        </SupabaseStorageProvider>
      </SupabaseProvider>
    </SiteContentProvider>
  );
}
