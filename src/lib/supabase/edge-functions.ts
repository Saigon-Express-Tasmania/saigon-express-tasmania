const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function functionsBaseUrl(): string {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return `${SUPABASE_URL}/functions/v1`;
}

function authHeaders(): HeadersInit {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

export async function invokeEdgeFunction<T>(
  name: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    searchParams?: Record<string, string>;
  } = {},
): Promise<{ data: T; ok: true } | { error: string; ok: false; status: number }> {
  const method = options.method ?? (options.body != null ? "POST" : "GET");
  let url = `${functionsBaseUrl()}/${name}`;

  if (options.searchParams) {
    url += `?${new URLSearchParams(options.searchParams).toString()}`;
  }

  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await res.json()) as T & { error?: string };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? `Request failed (${res.status})`,
    };
  }

  return { ok: true, data: payload };
}

/** Stripe webhook URL for the Supabase project (configure in Stripe Dashboard). */
export function stripeWebhookUrl(): string {
  return `${functionsBaseUrl()}/stripe-webhook`;
}
