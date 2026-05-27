import type { Metadata } from "next";
import "./globals.css";
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
  const siteContent = await getSiteContentSnapshot();

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
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
        <Providers siteContent={siteContent}>{children}</Providers>
      </body>
    </html>
  );
}
