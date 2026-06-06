import { supabase } from "@/lib/supabase/client";
import type { UserAuthMetadata, UserRole } from "@/types/UserProfile";

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

function parseIsVerified(value: unknown): boolean {
  return value === true || value === "true";
}

export function authMetadataFromAppMetadata(
  appMetadata: Record<string, unknown> | undefined,
): UserAuthMetadata {
  return {
    user_role: parseUserRole(appMetadata?.user_role),
    is_verified: parseIsVerified(appMetadata?.is_verified),
  };
}

export const DEFAULT_USER_AUTH_METADATA: UserAuthMetadata = {
  user_role: "user",
  is_verified: false,
};

/** Prefer user_metadata row; fall back to JWT app_metadata when unavailable. */
export async function fetchUserAuthMetadata(
  userId: string,
  appMetadata?: Record<string, unknown>,
): Promise<UserAuthMetadata> {
  const { data, error } = await supabase
    .from("user_metadata")
    .select("user_role, is_verified")
    .eq("id", userId)
    .maybeSingle();

  if (!error && data) {
    return {
      user_role: parseUserRole(data.user_role),
      is_verified: data.is_verified === true,
    };
  }

  return authMetadataFromAppMetadata(appMetadata);
}
