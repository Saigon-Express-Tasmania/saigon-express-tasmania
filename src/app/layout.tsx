import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { dmSans, notoSans, notoSerif } from "@/app/fonts";
import IntlRoot from "@/components/IntlRoot";
import NavigationProgress from "@/components/NavigationProgress";
import SiteChromeProviders from "@/components/SiteChromeProviders";

export const metadata: Metadata = {
  title: "Saigon Express Tasmania | Authentic Vietnamese Food",
  description:
    "Fresh Vietnamese bánh mì, phở, bún bowls & catering across 8 Tasmania locations. Order online for pickup today.",
};

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
      <head>
        <link
          rel="preload"
          href="/api/site-chrome"
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <IntlRoot>
          <SiteChromeProviders>{children}</SiteChromeProviders>
        </IntlRoot>
      </body>
    </html>
  );
}
