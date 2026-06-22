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

export type UserAuthMetadataLoad = {
  metadata: UserAuthMetadata;
  source: "database" | "jwt";
};

const METADATA_FETCH_MAX_ATTEMPTS = 4;
const METADATA_FETCH_RETRY_DELAY_MS = 75;

async function fetchUserAuthMetadataFromDatabase(
  userId: string,
): Promise<UserAuthMetadata | null> {
  const { data, error } = await supabase
    .from("user_metadata")
    .select("user_role, privileges")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    user_role: parseUserRole(data.user_role),
    privileges: parsePrivileges(data.privileges),
  };
}

/** Prefer user_metadata row; fall back to JWT app_metadata when unavailable. */
export async function fetchUserAuthMetadata(
  userId: string,
  appMetadata?: Record<string, unknown>,
): Promise<UserAuthMetadataLoad> {
  // Right after sign-in, auth.uid() can briefly be unset for PostgREST requests.
  await supabase.auth.getSession();

  for (let attempt = 0; attempt < METADATA_FETCH_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, METADATA_FETCH_RETRY_DELAY_MS * attempt);
      });
      await supabase.auth.getSession();
    }

    const metadata = await fetchUserAuthMetadataFromDatabase(userId);
    if (metadata) {
      return { metadata, source: "database" };
    }
  }

  return {
    metadata: authMetadataFromAppMetadata(appMetadata),
    source: "jwt",
  };
}
