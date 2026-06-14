import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { headers } from "next/headers";
import "./globals.css";
import { notoSans, notoSerif } from "@/app/fonts";
import { Providers } from "@/components/providers";
import { getSiteContentSnapshot } from "@/lib/supabase/site-content";
import { getActiveStoreLocations } from "@/lib/supabase/store-locations";

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
  const [siteContent, locale, messages, storeLocations, requestHeaders] =
    await Promise.all([
      getSiteContentSnapshot(),
      getLocale(),
      getMessages(),
      getActiveStoreLocations(),
      headers(),
    ]);

  const initialPathname = requestHeaders.get("x-pathname") ?? "";

  return (
    <html
      lang={locale}
      className={`${notoSerif.variable} ${notoSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>        
        <link
          rel="preload"
          href="/images/intro-cover.jpg"
          as="image"
          type="image/jpg"
          fetchPriority="high"
        />
        <link
          rel="preload"
          href="/videos/intro-960.mp4"
          as="video"
          type="video/mp4"
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers
            siteContent={siteContent}
            storeLocations={storeLocations}
            initialPathname={initialPathname}
          >
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
