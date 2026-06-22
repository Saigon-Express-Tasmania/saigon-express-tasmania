/** Append a prefilled Messenger compose message to an `m.me` / Facebook message URL. */
export function buildFacebookMessengerUrl(
  rawUrl: string,
  text?: string,
): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const trimmedText = text?.trim();
  if (!trimmedText) return trimmed;

  try {
    const url = new URL(trimmed);
    url.searchParams.set("text", trimmedText);
    return url.toString();
  } catch {
    const separator = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${separator}text=${encodeURIComponent(trimmedText)}`;
  }
}
