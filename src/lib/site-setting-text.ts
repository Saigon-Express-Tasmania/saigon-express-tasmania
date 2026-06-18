import { formatAustralianPhoneDisplay } from "@/lib/australian-phone";

const EMAIL_PLACEHOLDER = "{email}";
const PHONE_PLACEHOLDER = "{phone}";

export function withContactEmail(text: string, email?: string): string {
  const value = email?.trim() ?? "";
  return text.split(EMAIL_PLACEHOLDER).join(value);
}

export function withContactPhone(text: string, phone?: string): string {
  const value = phone
    ? (formatAustralianPhoneDisplay(phone) ?? phone.trim())
    : "";
  return text.split(PHONE_PLACEHOLDER).join(value);
}

export function interpolateContactText(
  text: string,
  options?: { email?: string; phone?: string },
): string {
  return withContactPhone(
    withContactEmail(text, options?.email),
    options?.phone,
  );
}
