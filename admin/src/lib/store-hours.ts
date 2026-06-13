/** Parse `store_locations.hours` JSON into a short human-readable label. */
export function formatStoreHours(
  hoursJson: string | null | undefined,
): string | null {
  if (!hoursJson?.trim()) return null;

  try {
    const parsed = JSON.parse(hoursJson) as Record<string, unknown>;
    const val = parsed.mon ?? parsed.Mon ?? Object.values(parsed)[0];
    if (val == null) return null;
    const text = String(val).trim();
    return text || null;
  } catch {
    const trimmed = hoursJson.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return null;
    return trimmed;
  }
}
