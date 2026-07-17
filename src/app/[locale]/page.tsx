import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import HomeJsonLdLoader from "@/components/home/HomeJsonLdLoader";
import Home from "@/views/Home";

/** ISR: serve cached HTML at the edge; regenerate at most hourly (matches SHORT_REVALIDATE_SECONDS). */
export const revalidate = 3600;

type LocaleHomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleHomePage({ params }: LocaleHomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Suspense fallback={null}>
        <HomeJsonLdLoader />
      </Suspense>
      <Home />
    </>
  );
}
