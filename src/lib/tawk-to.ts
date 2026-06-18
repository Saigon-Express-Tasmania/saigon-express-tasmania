const TAWK_EMBED_BASE = "https://embed.tawk.to";

export type TawkToConfig = {
  propertyId: string;
  widgetId: string;
};

export function getTawkToEmbedUrl(config: TawkToConfig): string {
  return `${TAWK_EMBED_BASE}/${config.propertyId}/${config.widgetId}`;
}

export type TawkWidgetCallbacks = {
  onChatMaximized?: () => void;
  onChatClosed?: () => void;
};

let activeTawkCallbacks: TawkWidgetCallbacks | undefined;

function notifyChatClosed(): void {
  hideTawkWidget();
  activeTawkCallbacks?.onChatClosed?.();
}

export function openTawkWidget(): void {
  window.Tawk_API?.showWidget?.();
  window.Tawk_API?.maximize?.();
}

export function hideTawkWidget(): void {
  window.Tawk_API?.hideWidget?.();
}

export function loadTawkWidget(
  config: TawkToConfig,
  callbacks?: TawkWidgetCallbacks,
): (() => void) | undefined {
  if (typeof window === "undefined") return undefined;

  activeTawkCallbacks = callbacks;

  const embedUrl = getTawkToEmbedUrl(config);
  const attachCallbacks = () => {
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_API.onChatMaximized = () => {
      activeTawkCallbacks?.onChatMaximized?.();
    };
    window.Tawk_API.onChatMinimized = notifyChatClosed;
    window.Tawk_API.onChatHidden = notifyChatClosed;
  };

  const configureTawkWidget = () => {
    window.Tawk_API = window.Tawk_API || {};
    attachCallbacks();
    window.Tawk_API.onLoad = () => {
      attachCallbacks();
      hideTawkWidget();
    };
    hideTawkWidget();
  };

  const existing = document.querySelector(`script[src="${embedUrl}"]`);
  if (existing) {
    configureTawkWidget();
    return undefined;
  }

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();
  configureTawkWidget();

  const script = document.createElement("script");
  script.async = true;
  script.src = embedUrl;
  script.charset = "UTF-8";
  script.crossOrigin = "anonymous";
  document.body.appendChild(script);

  return () => {
    script.remove();
    if (activeTawkCallbacks === callbacks) {
      activeTawkCallbacks = undefined;
    }
  };
}

declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void;
      minimize?: () => void;
      hideWidget?: () => void;
      showWidget?: () => void;
      onLoad?: () => void;
      onChatMaximized?: () => void;
      onChatMinimized?: () => void;
      onChatHidden?: () => void;
      isChatMaximized?: () => boolean;
      isChatMinimized?: () => boolean;
      isChatHidden?: () => boolean;
    };
    Tawk_LoadStart?: Date;
  }
}
