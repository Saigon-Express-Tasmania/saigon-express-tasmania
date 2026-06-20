"use client";

import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";
import { ENV } from "@/config/env";
import {
  COOKIE_CONSENT_CHANGE_EVENT,
  getCookieConsent,
  type CookieConsentStatus,
} from "@/lib/cookie-consent";
import { useEffect, useState } from "react";

export default function GoogleAnalytics() {
  const [consent, setConsent] = useState<CookieConsentStatus | null>(null);

  useEffect(() => {
    setConsent(getCookieConsent());

    const onConsentChange = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentStatus>).detail;
      setConsent(detail);
    };

    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsentChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onConsentChange);
    };
  }, []);

  if (!ENV.gaMeasurementId || consent !== "accepted") {
    return null;
  }

  return <NextGoogleAnalytics gaId={ENV.gaMeasurementId} />;
}
