"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ENABLE_FACEBOOK_MESSAGE, ENABLE_TAWT_TO } from "@/config/settings";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { isTawkWidgetSupported, loadTawkWidget } from "@/lib/tawk-to";

export function FloatingWidgets() {
  const t = useTranslations("FloatingWidgets");
  const facebookMessageLink = useSiteSetting("facebook_message_link")?.trim();
  const tawkPropertyId = useSiteSetting("tawt_to_property_id")?.trim();
  const tawkWidgetId = useSiteSetting("tawt_to_widget_id")?.trim();
  const tawkConfigured = Boolean(tawkPropertyId && tawkWidgetId);
  const tawkEnabled =
    ENABLE_TAWT_TO && tawkConfigured && isTawkWidgetSupported();
  const facebookEnabled = ENABLE_FACEBOOK_MESSAGE && Boolean(facebookMessageLink);

  useEffect(() => {
    if (!ENABLE_TAWT_TO || !tawkPropertyId || !tawkWidgetId) return;
    return loadTawkWidget({
      propertyId: tawkPropertyId,
      widgetId: tawkWidgetId,
    });
  }, [tawkPropertyId, tawkWidgetId]);

  if (!facebookEnabled) {
    return null;
  }

  return (
    <a
      href={facebookMessageLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed right-5 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 ${
        tawkEnabled ? "bottom-[7.5rem]" : "bottom-5"
      }`}
      style={{
        background: "linear-gradient(135deg, #0084ff 0%, #00c6ff 100%)",
      }}
      title="Message us on Facebook"
      aria-label={t("aria.facebookCta")}
    >
      <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
        <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.879 1.436 5.449 3.686 7.133V22l3.371-1.853c.9.25 1.854.386 2.943.386 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.018 12.436l-2.55-2.72-4.976 2.72 5.474-5.808 2.612 2.72 4.914-2.72-5.474 5.808z" />
      </svg>
    </a>
  );
}
