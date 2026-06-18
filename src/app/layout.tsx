import { Suspense } from "react";
import "./globals.css";
import { dmSans, notoSans, notoSerif } from "@/app/fonts";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import IntlRoot from "@/components/IntlRoot";
import NavigationProgress from "@/components/NavigationProgress";
import SiteChromeProviders from "@/components/SiteChromeProviders";
import { rootLayoutMetadata } from "@/lib/seo-metadata";
import { getSiteContentSnapshot } from "@/lib/supabase/site-content";
import { getStoreLocations } from "@/lib/supabase/store-locations";
import { loadWholesaleCartConfig } from "@/lib/wholesale-page";

export const metadata = rootLayoutMetadata;

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
