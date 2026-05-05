import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { HomePage } from "@/features/home/home-page";
import messages from "../../messages/en-US.json";
import { DEFAULT_LOCALE } from "@/config";

export default function Home() {
  setRequestLocale(DEFAULT_LOCALE);

  return (
    <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
      <HomePage />
    </NextIntlClientProvider>
  );
}
