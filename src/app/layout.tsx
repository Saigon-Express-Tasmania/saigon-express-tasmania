import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { dmSans, notoSans, notoSerif } from "@/app/fonts";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import IntlRoot from "@/components/IntlRoot";
import NavigationProgress from "@/components/NavigationProgress";
import SiteChromeProviders from "@/components/SiteChromeProviders";
import { getSiteContentSnapshot } from "@/lib/supabase/site-content";
import { getStoreLocations } from "@/lib/supabase/store-locations";
import { loadWholesaleCartConfig } from "@/lib/wholesale-page";

export const metadata: Metadata = {
  title: "Saigon Express Tasmania | Authentic Vietnamese Food",
  description:
    "Fresh Vietnamese bánh mì, phở, bún bowls & catering across 8 Tasmania locations. Order online for pickup today.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [siteContent, storeLocations, wholesaleCartConfig] = await Promise.all([
    getSiteContentSnapshot(),
    getStoreLocations(),
    loadWholesaleCartConfig(),
  ]);

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${notoSerif.variable} ${notoSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <IntlRoot>
          <SiteChromeProviders
            siteContent={siteContent}
            storeLocations={storeLocations}
            wholesaleCartConfig={wholesaleCartConfig}
          >
            {children}
          </SiteChromeProviders>
        </IntlRoot>
      </body>
    </html>
  );
}
