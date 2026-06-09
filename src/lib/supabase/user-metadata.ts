import { supabase } from "@/lib/supabase/client";
import { parsePrivileges } from "@/lib/privileges";
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

export function authMetadataFromAppMetadata(
  appMetadata: Record<string, unknown> | undefined,
): UserAuthMetadata {
  return {
    user_role: parseUserRole(appMetadata?.user_role),
    privileges: parsePrivileges(appMetadata?.privileges),
  };
}

export const DEFAULT_USER_AUTH_METADATA: UserAuthMetadata = {
  user_role: "user",
  privileges: ["personal"],
};

/** Prefer user_metadata row; fall back to JWT app_metadata when unavailable. */
export async function fetchUserAuthMetadata(
  userId: string,
  appMetadata?: Record<string, unknown>,
): Promise<UserAuthMetadata> {
  const { data, error } = await supabase
    .from("user_metadata")
    .select("user_role, privileges")
    .eq("id", userId)
    .maybeSingle();

  if (!error && data) {
    return {
      user_role: parseUserRole(data.user_role),
      privileges: parsePrivileges(data.privileges),
    };
  }

  return authMetadataFromAppMetadata(appMetadata);
}
