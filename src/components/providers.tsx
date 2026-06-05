"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import CartDrawer from "@/components/CartDrawer";
import { FloatingWidgets } from "@/components/FloatingWidgets";
import { SiteContentProvider } from "@/contexts/SiteContentContext";
import type { SiteContentSnapshot, StoreLocation } from "@/types";
import MainHeader from "@/components/MainHeader";
import MainFooter from "@/components/MainFooter";

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
      <ThemeProvider defaultTheme="light">
        <CartProvider>
          <TooltipProvider>
            <MainHeader storeLocations={storeLocations} />
            {children}
            <MainFooter />
            <CartDrawer />
            <FloatingWidgets />
            <Toaster />
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </SiteContentProvider>
  );
}
