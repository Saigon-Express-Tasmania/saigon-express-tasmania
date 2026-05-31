"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import CartDrawer from "@/components/CartDrawer";
import { FloatingWidgets } from "@/components/FloatingWidgets";
import { SiteContentProvider } from "@/contexts/SiteContentContext";
import type { SiteContentSnapshot } from "@/types";
import MainHeader from "@/components/MainHeader";
import MainFooter from "@/components/MainFooter";

interface ProvidersProps {
  children: React.ReactNode;
  siteContent: SiteContentSnapshot;
}

export function Providers({ children, siteContent }: ProvidersProps) {
  return (
    <SiteContentProvider initialData={siteContent}>
      <ThemeProvider defaultTheme="light">
        <CartProvider>
          <TooltipProvider>
            <MainHeader />
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
