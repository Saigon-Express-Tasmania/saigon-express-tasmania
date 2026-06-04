const MAILTRAP_API_TOKEN_NAME = "MAILTRAP_API_TOKEN";

/** Supabase-injected secret (Dashboard → Edge Functions → Secrets). */
function requireSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing Supabase secret: ${name}`);
  }
  return value;
}

export function getMailtrapApiToken(): string {
  return requireSecret(MAILTRAP_API_TOKEN_NAME);
}
