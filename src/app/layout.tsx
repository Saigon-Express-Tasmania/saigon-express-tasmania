import { Suspense } from "react";
import "./globals.css";
import { dmSans, notoSans, notoSerif } from "@/app/fonts";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import IntlRoot from "@/components/IntlRoot";
import NavigationProgress from "@/components/NavigationProgress";
import SiteChromeProviders from "@/components/SiteChromeProviders";
import SiteChromeProvidersLoader from "@/components/SiteChromeProvidersLoader";
import {
  DEFAULT_SELF_DELIVERY_FEE,
  DEFAULT_SELF_DELIVERY_ORIGIN,
  DEFAULT_WHOLESALE_CART_CONFIG,
  EMPTY_SITE_CONTENT_SNAPSHOT,
} from "@/lib/site-chrome-defaults";
import { rootLayoutMetadata } from "@/lib/seo-metadata";

export const metadata = rootLayoutMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <Suspense
            fallback={
              <SiteChromeProviders
                siteContent={EMPTY_SITE_CONTENT_SNAPSHOT}
                storeLocations={[]}
                deliveryCities={[]}
                wholesaleCartConfig={DEFAULT_WHOLESALE_CART_CONFIG}
                selfDeliveryFee={DEFAULT_SELF_DELIVERY_FEE}
                selfDeliveryOrigin={DEFAULT_SELF_DELIVERY_ORIGIN}
              >
                {children}
              </SiteChromeProviders>
            }
          >
            <SiteChromeProvidersLoader>{children}</SiteChromeProvidersLoader>
          </Suspense>
        </IntlRoot>
      </body>
    </html>
  );
}
