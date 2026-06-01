/** URL-safe slug from a display name (strips diacritics). */
export function slugFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Use stored slug when present; otherwise derive from name. */
export function resolveMenuSlug(
  slug: string | null | undefined,
  name: string,
): string {
  const trimmed = slug?.trim();
  if (trimmed) return trimmed;
  return slugFromName(name);
}
