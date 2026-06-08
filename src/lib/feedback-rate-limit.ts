export const FEEDBACK_COOLDOWN_MS = 5 * 60 * 1000;

const STORAGE_KEY = "saigon_feedback_last_submit_faq";

export function getFeedbackCooldownEnd(): number | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  const lastSubmit = Number.parseInt(raw, 10);
  if (!Number.isFinite(lastSubmit)) return null;

  const cooldownEnd = lastSubmit + FEEDBACK_COOLDOWN_MS;
  return cooldownEnd > Date.now() ? cooldownEnd : null;
}

export function recordFeedbackSubmit(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

export function formatCooldownRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export type SubmitFeedbackInput = {
  name: string;
  email?: string;
  question: string;
  source?: "faq";
};

export type SubmitFeedbackResult = {
  id: number;
  submitted: boolean;
};

export function parseSubmitFeedbackResult(
  data: unknown,
): SubmitFeedbackResult | null {
  if (!data || typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  const id = record.id;
  const submitted = record.submitted;

  if (typeof id !== "number" || typeof submitted !== "boolean") {
    return null;
  }

  return { id, submitted };
}
