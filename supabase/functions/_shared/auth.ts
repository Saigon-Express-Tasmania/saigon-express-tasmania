import { createClient } from "npm:@supabase/supabase-js@2.107.0";
import { jsonResponse } from "./cors.ts";
import { createServiceClient } from "./supabase.ts";

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

/**
 * Requires a valid Supabase session and `user_profiles.user_role = 'admin'`.
 * Matches admin app sign-in checks (see SupabaseAuthContext.ensureAdminAccess).
 */
export async function requireAdmin(req: Request): Promise<AdminAuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
  }

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const service = createServiceClient();
  const { data: profile, error: profileError } = await service
    .from("user_profiles")
    .select("user_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[auth] Failed to load user profile:", profileError.message);
    return { ok: false, response: jsonResponse({ error: "Unable to verify access" }, 500) };
  }

  if (profile?.user_role !== "admin") {
    return { ok: false, response: jsonResponse({ error: "Forbidden" }, 403) };
  }

  return { ok: true, userId: user.id };
}
