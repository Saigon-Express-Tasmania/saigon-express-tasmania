"use client";

import Link from "@/components/link";
import {
  COOKIE_CONSENT_OPEN_EVENT,
  getCookieConsent,
  setCookieConsent,
  type CookieConsentStatus,
} from "@/lib/cookie-consent";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export default function CookieConsent() {
  const t = useTranslations("CookieConsent");
  const [consent, setConsent] = useState<CookieConsentStatus | null>(null);
  const [ready, setReady] = useState(false);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    setConsent(getCookieConsent());
    setReady(true);

    const onOpen = () => setReopened(true);
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
    };
  }, []);

  if (!ready || (consent !== null && !reopened)) {
    return null;
  }

  const handleChoice = (status: CookieConsentStatus) => {
    setCookieConsent(status);
    setConsent(status);
    setReopened(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("ariaLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-stone-600">
          {t("message")}{" "}
          <Link
            href="/privacy-policy"
            className="font-medium text-red-700 underline underline-offset-2 hover:text-red-800"
          >
            {t("privacyPolicy")}
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => handleChoice("rejected")}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            {t("essentialOnly")}
          </button>
          <button
            type="button"
            onClick={() => handleChoice("accepted")}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
