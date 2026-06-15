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
import type { SiteContentSnapshot, StoreLocation } from "@/types";

const WholesaleShoppingCart = dynamic(
  () => import("@/components/WholesaleShoppingCart"),
  { ssr: false },
);

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
                    <AppChrome storeLocations={storeLocations}>
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
