const NON_DIGIT = /\D/g;

export function normalizeAustralianPhoneNationalDigits(
  raw: string,
): string | null {
  let digits = raw.replace(NON_DIGIT, "");
  if (!digits) return null;

  if (digits.startsWith("61")) {
    digits = `0${digits.slice(2)}`;
  } else if (digits.length === 9 && digits.startsWith("4")) {
    digits = `0${digits}`;
  }

  return digits;
}

export function formatAustralianPhoneDisplay(raw?: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const digits = normalizeAustralianPhoneNationalDigits(trimmed);
  if (!digits) return null;

  if (/^04\d{8}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  if (/^0[2378]\d{8}$/.test(digits)) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  if (/^1300\d{6}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  if (/^1800\d{6}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  if (/^13\d{4}$/.test(digits)) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  return trimmed;
}

export function formatAustralianPhoneTelHref(raw?: string): string | null {
  const digits = raw?.trim()
    ? normalizeAustralianPhoneNationalDigits(raw)
    : null;
  if (!digits) return null;
  return `tel:${digits}`;
}

export type FormattedAustralianPhone = {
  display: string;
  telHref: string;
};

export function formatAustralianPhone(
  raw?: string,
): FormattedAustralianPhone | null {
  const display = formatAustralianPhoneDisplay(raw);
  const telHref = formatAustralianPhoneTelHref(raw);
  if (!display || !telHref) return null;
  return { display, telHref };
}

/** `https://wa.me/` link for the `whatsapp_phone_number` settings value. */
export function buildWhatsAppUrl(raw?: string, text?: string): string | null {
  const national = normalizeAustralianPhoneNationalDigits(raw?.trim() ?? "");
  if (!national?.startsWith("0")) return null;
  const base = `https://wa.me/61${national.slice(1)}`;
  const trimmedText = text?.trim();
  if (!trimmedText) return base;
  return `${base}?text=${encodeURIComponent(trimmedText)}`;
}
