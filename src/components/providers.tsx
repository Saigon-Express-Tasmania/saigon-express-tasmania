"use client";

import AppChrome from "@/components/AppChrome";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { WholesaleCartProvider } from "@/contexts/WholesaleCartContext";
import { WholesaleInventoryProvider } from "@/contexts/WholesaleInventoryContext";
import WholesaleCartInventorySync from "@/components/WholesaleCartInventorySync";
import WholesaleShoppingCart from "@/components/WholesaleShoppingCart";
import { SiteContentProvider } from "@/contexts/SiteContentContext";
import { SupabaseProvider } from "@/contexts/SupabaseContext";
import { SupabaseStorageProvider } from "@/contexts/SupabaseStorageContext";
import type { SiteContentSnapshot, StoreLocation } from "@/types";

interface ProvidersProps {
  children: React.ReactNode;
  siteContent: SiteContentSnapshot;
  storeLocations: StoreLocation[];
  initialPathname: string;
}

export function Providers({
  children,
  siteContent,
  storeLocations,
  initialPathname,
}: ProvidersProps) {
  return (
    <SiteContentProvider initialData={siteContent}>
      <SupabaseProvider>
        <SupabaseStorageProvider>
          <ThemeProvider defaultTheme="light">
            <CartProvider>
              <WholesaleInventoryProvider>
                <WholesaleCartProvider>
                  <WholesaleCartInventorySync />
                  <TooltipProvider>
                    <AppChrome
                      storeLocations={storeLocations}
                      initialPathname={initialPathname}
                    >
                      {children}
                    </AppChrome>
                    <WholesaleShoppingCart />
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
