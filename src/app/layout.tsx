import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { notoSans, notoSerif } from "@/app/fonts";
import { Providers } from "@/components/providers";
import { getSiteContentSnapshot } from "@/lib/supabase/site-content";

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
  const [siteContent, locale, messages] = await Promise.all([
    getSiteContentSnapshot(),
    getLocale(),
    getMessages(),
  ]);

  return (
    <html
      lang={locale}
      className={`${notoSerif.variable} ${notoSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>        
        <link
          rel="preload"
          href="/manus-storage/saigo_express__video_cover.webp"
          as="image"
          fetchPriority="high"
        />
        <link
          rel="preload"
          href="/manus-storage/BanhMi_web_03ab6374.mp4"
          as="video"
          type="video/mp4"
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers siteContent={siteContent}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
