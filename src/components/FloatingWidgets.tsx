"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { WhatsAppIcon } from "@/components/icons/brand-icons";
import {
  ENABLE_FACEBOOK_MESSAGE,
  ENABLE_TAWT_TO,
  ENABLE_WHATSAPP_MESSAGE,
} from "@/config/settings";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { buildFacebookMessengerUrl } from "@/lib/facebook-messenger";
import { buildWhatsAppUrl } from "@/lib/australian-phone";
import { isTawkWidgetSupported, loadTawkWidget } from "@/lib/tawk-to";

const BUTTON_SIZE_PX = 52;
const BUTTON_GAP_PX = 12;
const BASE_BOTTOM_PX = 20;
const TAWK_RESERVE_PX = 100;

type FloatingButtonConfig = {
  key: string;
  href: string;
  title: string;
  ariaLabel: string;
  background: string;
  icon: ReactNode;
};

function floatingButtonBottom(index: number, tawkEnabled: boolean): number {
  const base = tawkEnabled ? BASE_BOTTOM_PX + TAWK_RESERVE_PX : BASE_BOTTOM_PX;
  return base + index * (BUTTON_SIZE_PX + BUTTON_GAP_PX);
}

export function FloatingWidgets() {
  const t = useTranslations("FloatingWidgets");
  const facebookMessageLink = useSiteSetting("facebook_message_link")?.trim();
  const whatsappPhoneNumber = useSiteSetting("whatsapp_phone_number")?.trim();
  const tawkPropertyId = useSiteSetting("tawt_to_property_id")?.trim();
  const tawkWidgetId = useSiteSetting("tawt_to_widget_id")?.trim();
  const tawkConfigured = Boolean(tawkPropertyId && tawkWidgetId);
  const tawkEnabled =
    ENABLE_TAWT_TO && tawkConfigured && isTawkWidgetSupported();
  const messagePrefill = t("messagePrefill");
  const whatsappUrl = buildWhatsAppUrl(whatsappPhoneNumber, messagePrefill);
  const facebookUrl = buildFacebookMessengerUrl(
    facebookMessageLink ?? "",
    messagePrefill,
  );
  const whatsappEnabled = ENABLE_WHATSAPP_MESSAGE && Boolean(whatsappUrl);
  const facebookEnabled =
    ENABLE_FACEBOOK_MESSAGE && Boolean(facebookUrl);

  useEffect(() => {
    if (!ENABLE_TAWT_TO || !tawkPropertyId || !tawkWidgetId) return;
    return loadTawkWidget({
      propertyId: tawkPropertyId,
      widgetId: tawkWidgetId,
    });
  }, [tawkPropertyId, tawkWidgetId]);

  const buttons = useMemo(() => {
    const items: FloatingButtonConfig[] = [];

    if (facebookEnabled && facebookUrl) {
      items.push({
        key: "facebook",
        href: facebookUrl,
        title: "Message us on Facebook",
        ariaLabel: t("aria.facebookCta"),
        background: "linear-gradient(135deg, #0084ff 0%, #00c6ff 100%)",
        icon: (
          <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
            <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.879 1.436 5.449 3.686 7.133V22l3.371-1.853c.9.25 1.854.386 2.943.386 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.018 12.436l-2.55-2.72-4.976 2.72 5.474-5.808 2.612 2.72 4.914-2.72-5.474 5.808z" />
          </svg>
        ),
      });
    }

    if (whatsappEnabled && whatsappUrl) {
      items.push({
        key: "whatsapp",
        href: whatsappUrl,
        title: "Message us on WhatsApp",
        ariaLabel: t("aria.whatsappCta"),
        background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
        icon: <WhatsAppIcon size={26} className="text-white" />,
      });
    }

    return items;
  }, [facebookEnabled, facebookUrl, t, whatsappEnabled, whatsappUrl]);

  if (buttons.length === 0) {
    return null;
  }

  return (
    <>
      {buttons.map((button, index) => (
        <a
          key={button.key}
          href={button.href}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-5 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
          style={{
            bottom: floatingButtonBottom(index, tawkEnabled),
            background: button.background,
          }}
          title={button.title}
          aria-label={button.ariaLabel}
        >
          {button.icon}
        </a>
      ))}
    </>
  );
}
