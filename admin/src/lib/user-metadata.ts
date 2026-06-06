import supabase from '@/lib/supabase/client';
import type { UserRole } from '@/types/UserProfile';

export type UserMetadataRow = {
  id: string;
  user_role: UserRole;
  is_verified: boolean;
};

export const USER_METADATA_SELECT = 'id, user_role, is_verified';

export function parseUserRole(value: unknown): UserRole {
  if (
    value === 'none' ||
    value === 'user' ||
    value === 'admin' ||
    value === 'partner'
  ) {
    return value;
  }

  return 'user';
}

export async function fetchUserMetadataByIds(
  ids: string[],
): Promise<Map<string, UserMetadataRow>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('user_metadata')
    .select(USER_METADATA_SELECT)
    .in('id', ids);

  if (error) throw error;

  return new Map(
    ((data as UserMetadataRow[] | null) ?? []).map((row) => [row.id, row]),
  );
}

export async function fetchUnverifiedUserIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_metadata')
    .select('id')
    .eq('is_verified', false);

  if (error) throw error;

  return ((data as { id: string }[] | null) ?? []).map((row) => row.id);
}

export async function fetchVerifiedUserIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_metadata')
    .select('id')
    .eq('is_verified', true);

  if (error) throw error;

  return ((data as { id: string }[] | null) ?? []).map((row) => row.id);
}

export async function updateUserMetadata(
  userId: string,
  updates: Partial<Pick<UserMetadataRow, 'user_role' | 'is_verified'>>,
): Promise<void> {
  const { error } = await supabase
    .from('user_metadata')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}
