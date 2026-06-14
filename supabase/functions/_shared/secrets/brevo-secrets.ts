const BREVO_API_KEY_NAME = "BREVO_API_KEY";

/** Supabase-injected secret (Dashboard → Edge Functions → Secrets). */
function requireSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing Supabase secret: ${name}`);
  }
  return value;
}

export function getBrevoApiKey(): string {
  return requireSecret(BREVO_API_KEY_NAME);
}
