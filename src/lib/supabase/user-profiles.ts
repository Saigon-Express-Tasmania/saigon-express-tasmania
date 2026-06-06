import { supabase } from "@/lib/supabase/client";
import type { UserProfile, UserProfileSelfUpdate } from "@/types/UserProfile";

const PROFILE_SELECT = "*";

export function sanitizeProfileSelfUpdate(
  updates: UserProfileSelfUpdate,
): UserProfileSelfUpdate {
  const {
    id: _id,
    display_name: _displayName,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...safe
  } = updates as UserProfileSelfUpdate & {
    id?: unknown;
    display_name?: unknown;
    created_at?: unknown;
    updated_at?: unknown;
  };

  return safe;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UserProfile | null) ?? null;
}

export async function updateUserProfile(
  userId: string,
  updates: UserProfileSelfUpdate,
): Promise<UserProfile> {
  const safeUpdates = sanitizeProfileSelfUpdate(updates);

  const { data, error } = await supabase
    .from("user_profiles")
    .update(safeUpdates)
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as UserProfile;
}
