const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

/** Parses comma/semicolon-separated addresses or a JSON array of strings. */
export function parseEmailList(value: unknown, fieldName: string): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    const emails = value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    for (const email of emails) {
      if (!isValidEmail(email)) {
        throw new Error(`${fieldName} contains invalid email: ${email}`);
      }
    }
    return emails;
  }

  const raw = String(value).trim();
  if (!raw) return [];

  const emails = raw
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const email of emails) {
    if (!isValidEmail(email)) {
      throw new Error(`${fieldName} contains invalid email: ${email}`);
    }
  }

  return emails;
}
