const TAWK_EMBED_BASE = "https://embed.tawk.to";

export type TawkToConfig = {
  propertyId: string;
  widgetId: string;
};

export function getTawkToEmbedUrl(config: TawkToConfig): string {
  return `${TAWK_EMBED_BASE}/${config.propertyId}/${config.widgetId}`;
}

/** Tawk performance/session endpoints reject localhost origins (CORS). */
export function isTawkWidgetSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}

export function loadTawkWidget(
  config: TawkToConfig,
): (() => void) | undefined {
  if (typeof window === "undefined" || !isTawkWidgetSupported()) {
    return undefined;
  }

  const embedUrl = getTawkToEmbedUrl(config);
  const existing = document.querySelector(`script[src="${embedUrl}"]`);
  if (existing) return undefined;

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  const script = document.createElement("script");
  script.async = true;
  script.src = embedUrl;
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");

  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.body.appendChild(script);
  }

  return () => {
    script.remove();
  };
}

declare global {
  interface Window {
    Tawk_API?: Record<string, unknown>;
    Tawk_LoadStart?: Date;
  }
}
