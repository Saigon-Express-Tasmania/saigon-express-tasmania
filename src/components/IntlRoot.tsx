"use client";

import { DEFAULT_LOCALE } from "@/config/localize";
import { APP_MESSAGES, type AppLocale } from "@/lib/i18n-messages";
import { NextIntlClientProvider } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

function localeFromPathname(pathname: string): AppLocale {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment === "vi") {
    return "vi";
  }
  return DEFAULT_LOCALE as AppLocale;
}

type IntlRootProps = {
  children: ReactNode;
};

export default function IntlRoot({ children }: IntlRootProps) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname ?? "/");

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={APP_MESSAGES[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
