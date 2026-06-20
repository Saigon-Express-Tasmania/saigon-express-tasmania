export const COOKIE_CONSENT_KEY = "saigon-cookie-consent";

export type CookieConsentStatus = "accepted" | "rejected";

export const COOKIE_CONSENT_CHANGE_EVENT = "cookie-consent-change";
export const COOKIE_CONSENT_OPEN_EVENT = "cookie-consent-open";

export function getCookieConsent(): CookieConsentStatus | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  if (value === "accepted" || value === "rejected") {
    return value;
  }

  return null;
}

export function setCookieConsent(status: CookieConsentStatus): void {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, status);
  window.dispatchEvent(
    new CustomEvent<CookieConsentStatus>(COOKIE_CONSENT_CHANGE_EVENT, {
      detail: status,
    }),
  );
}

export function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_OPEN_EVENT));
}
