const EMAIL_PLACEHOLDER = "{email}";

export function withContactEmail(text: string, email?: string): string {
  const value = email?.trim() ?? "";
  return text.split(EMAIL_PLACEHOLDER).join(value);
}
