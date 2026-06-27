"use client";

import AppChrome from "@/components/AppChrome";
import CateringGuestLastOrderPanel from "@/components/CateringGuestLastOrderPanel";
import ClientOnly from "@/components/ClientOnly";
import CookieConsent from "@/components/CookieConsent";
import DeferredShoppingCarts from "@/components/DeferredShoppingCarts";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import WholesaleCartInventorySync from "@/components/WholesaleCartInventorySync";
import { CateringCartProvider } from "@/contexts/CateringCartContext";
import { CommerceCartConfigProvider } from "@/contexts/CommerceCartConfigContext";
import { CommerceTaxProvider } from "@/contexts/CommerceTaxContext";
import { CartProvider } from "@/contexts/CartContext";
import { GuestCateringOrderProvider } from "@/contexts/GuestCateringOrderContext";
import { SiteContentProvider } from "@/contexts/SiteContentContext";
import { SupabaseProvider } from "@/contexts/SupabaseContext";
import { SupabaseStorageProvider } from "@/contexts/SupabaseStorageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WholesaleCartProvider } from "@/contexts/WholesaleCartContext";
import { WholesaleInventoryProvider } from "@/contexts/WholesaleInventoryContext";
import { setClientStoreLocations } from "@/lib/supabase/store-locations-client";
import type { SiteContentSnapshot, StoreLocation } from "@/types";

interface ProvidersProps {
  children: React.ReactNode;
  siteContent: SiteContentSnapshot;
  storeLocations: StoreLocation[];
}

export function Providers({
  children,
  siteContent,
  storeLocations,
}: ProvidersProps) {
  setClientStoreLocations(storeLocations);

  return (
    <SiteContentProvider initialData={siteContent}>
      <SupabaseProvider>
        <SupabaseStorageProvider>
          <ThemeProvider defaultTheme="light">
            <CartProvider>
              <WholesaleInventoryProvider>
                <CommerceCartConfigProvider>
                  <WholesaleCartProvider>
                    <CommerceTaxProvider>
                      <CateringCartProvider>
                        <GuestCateringOrderProvider>
                          <WholesaleCartInventorySync />
                          <TooltipProvider>
                            <AppChrome storeLocations={storeLocations}>
                              {children}
                            </AppChrome>
                            <ClientOnly>
                              <DeferredShoppingCarts
                                storeLocations={storeLocations}
                              />
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
                    </CommerceTaxProvider>
                  </WholesaleCartProvider>
                </CommerceCartConfigProvider>
              </WholesaleInventoryProvider>
            </CartProvider>
          </ThemeProvider>
        </SupabaseStorageProvider>
      </SupabaseProvider>
    </SiteContentProvider>
  );
}
