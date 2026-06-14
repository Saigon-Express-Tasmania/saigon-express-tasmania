import { createClient, type User } from "npm:@supabase/supabase-js@2.107.0";
import { jsonResponse } from "./cors.ts";
import { createServiceClient } from "./supabase.ts";

export type UserRole = "none" | "user" | "admin" | "partner";

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export type AuthenticatedUserResult =
  | { ok: true; user: User }
  | { ok: false; response: Response };

/** Matches admin app `parseUserRole` (SupabaseAuthContext.ensureAdminAccess). */
export function parseUserRole(value: unknown): UserRole {
  if (
    value === "none" ||
    value === "user" ||
    value === "admin" ||
    value === "partner"
  ) {
    return value;
  }

  return "user";
}

function roleFromJwtUser(user: User): UserRole {
  return parseUserRole(user.app_metadata?.user_role);
}

async function loadUserRoleFromMetadata(userId: string): Promise<UserRole | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("user_metadata")
    .select("user_role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user metadata: ${error.message}`);
  }

  if (!data) return null;
  return parseUserRole(data.user_role);
}

/** Prefer `user_metadata.user_role`; fall back to JWT app_metadata when missing. */
export async function resolveUserRole(user: User): Promise<UserRole> {
  try {
    const metadataRole = await loadUserRoleFromMetadata(user.id);
    if (metadataRole != null) return metadataRole;
  } catch (err) {
    console.error("[auth] Failed to load user metadata:", err);
    throw err;
  }

  return roleFromJwtUser(user);
}

export async function requireAuthenticatedUser(
  req: Request,
): Promise<AuthenticatedUserResult> {
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

  return { ok: true, user };
}

/**
 * Requires a valid Supabase session and `user_metadata.user_role = 'admin'`.
 * Matches admin app sign-in checks (see SupabaseAuthContext.ensureAdminAccess).
 */
export async function requireAdmin(req: Request): Promise<AdminAuthResult> {
  const auth = await requireAuthenticatedUser(req);
  if (!auth.ok) return auth;

  let role: UserRole;
  try {
    role = await resolveUserRole(auth.user);
  } catch {
    return { ok: false, response: jsonResponse({ error: "Unable to verify access" }, 500) };
  }

  if (role !== "admin") {
    return { ok: false, response: jsonResponse({ error: "Forbidden" }, 403) };
  }

  return { ok: true, userId: auth.user.id };
}
