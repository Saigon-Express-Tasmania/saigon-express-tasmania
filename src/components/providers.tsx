"use client";

import AppChrome from "@/components/AppChrome";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { WholesaleCartProvider } from "@/contexts/WholesaleCartContext";
import WholesaleShoppingCart from "@/components/WholesaleShoppingCart";
import { SiteContentProvider } from "@/contexts/SiteContentContext";
import { SupabaseProvider } from "@/contexts/SupabaseContext";
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
        <ThemeProvider defaultTheme="light">
          <CartProvider>
            <WholesaleCartProvider>
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
          </CartProvider>
        </ThemeProvider>
      </SupabaseProvider>
    </SiteContentProvider>
  );
}
