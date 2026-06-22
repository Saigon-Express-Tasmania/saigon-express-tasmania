export const CATERING_ORDER_RATE_LIMIT_MAX = 5;
export const CATERING_ORDER_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const STORAGE_KEY = "saigon_catering_order_placement_times";

export type CateringOrderRateLimitState = {
  isLimited: boolean;
  remainingMs: number;
  placementCount: number;
};

function readRawTimestamps(): number[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
  } catch {
    return [];
  }
}

function writeTimestamps(timestamps: number[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps));
}

export function prunePlacementTimestamps(
  timestamps: number[],
  now = Date.now(),
): number[] {
  return timestamps.filter((timestamp) => now - timestamp < CATERING_ORDER_RATE_LIMIT_WINDOW_MS);
}

export function getCateringOrderRateLimitState(
  now = Date.now(),
): CateringOrderRateLimitState {
  const pruned = prunePlacementTimestamps(readRawTimestamps(), now);

  if (pruned.length < CATERING_ORDER_RATE_LIMIT_MAX) {
    return {
      isLimited: false,
      remainingMs: 0,
      placementCount: pruned.length,
    };
  }

  const oldest = Math.min(...pruned);
  const remainingMs = Math.max(0, oldest + CATERING_ORDER_RATE_LIMIT_WINDOW_MS - now);

  return {
    isLimited: remainingMs > 0,
    remainingMs,
    placementCount: pruned.length,
  };
}

export function recordCateringOrderPlacement(now = Date.now()): void {
  const pruned = prunePlacementTimestamps(readRawTimestamps(), now);
  writeTimestamps([...pruned, now]);
}

export function clearCateringOrderRateLimit(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function formatRateLimitCooldown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
