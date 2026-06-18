"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { loadTawkWidget, openTawkWidget } from "@/lib/tawk-to";

export function FloatingWidgets() {
  const t = useTranslations("FloatingWidgets");
  const facebookMessageLink = useSiteSetting("facebook_message_link")?.trim();
  const tawkPropertyId = useSiteSetting("tawt_to_property_id")?.trim();
  const tawkWidgetId = useSiteSetting("tawt_to_widget_id")?.trim();
  const tawkEnabled = Boolean(tawkPropertyId && tawkWidgetId);
  const [tawkChatOpen, setTawkChatOpen] = useState(false);
  const tawkChatOpenRef = useRef(tawkChatOpen);
  const tawkOpenedAtRef = useRef(0);
  tawkChatOpenRef.current = tawkChatOpen;

  useEffect(() => {
    if (!tawkPropertyId || !tawkWidgetId) return;
    return loadTawkWidget(
      {
        propertyId: tawkPropertyId,
        widgetId: tawkWidgetId,
      },
      {
        onChatMaximized: () => {
          tawkOpenedAtRef.current = Date.now();
          setTawkChatOpen(true);
        },
        onChatClosed: () => setTawkChatOpen(false),
      },
    );
  }, [tawkPropertyId, tawkWidgetId]);

  useEffect(() => {
    if (!tawkEnabled || !tawkChatOpen) return;

    const syncChatOpenState = () => {
      if (Date.now() - tawkOpenedAtRef.current < 600) return;

      const api = window.Tawk_API;
      if (!api?.isChatMaximized) return;
      if (!api.isChatMaximized() && tawkChatOpenRef.current) {
        setTawkChatOpen(false);
      }
    };

    const intervalId = window.setInterval(syncChatOpenState, 400);
    return () => window.clearInterval(intervalId);
  }, [tawkEnabled, tawkChatOpen]);

  const handleOpenTawk = () => {
    tawkOpenedAtRef.current = Date.now();
    setTawkChatOpen(true);
    openTawkWidget();
  };

  const showFloatingButtons = !tawkChatOpen;

  return (
    <>
      {facebookMessageLink && showFloatingButtons ? (
        <a
          href={facebookMessageLink}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-[7.5rem] right-5 z-50 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #0084ff 0%, #00c6ff 100%)",
            width: 52,
            height: 52,
          }}
          title="Message us on Facebook"
          aria-label={t("aria.facebookCta")}
        >
          <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
            <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.879 1.436 5.449 3.686 7.133V22l3.371-1.853c.9.25 1.854.386 2.943.386 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.018 12.436l-2.55-2.72-4.976 2.72 5.474-5.808 2.612 2.72 4.914-2.72-5.474 5.808z" />
          </svg>
        </a>
      ) : null}

      {tawkEnabled && showFloatingButtons ? (
        <button
          type="button"
          onClick={handleOpenTawk}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 select-none"
          style={{
            background: "oklch(40% 0.18 25)",
            animation: "chat-pulse 2.5s ease-in-out infinite",
          }}
          aria-label={t("aria.openChat")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6 shrink-0"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-white font-bold text-base whitespace-nowrap tracking-wide">
            {t("titles.widgetBtn")}
          </span>
        </button>
      ) : null}
    </>
  );
}
