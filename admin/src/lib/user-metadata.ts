import supabase from '@/lib/supabase/client';
import {
  parsePrivileges,
  PORTAL_PARTNER_PRIVILEGES,
} from '@/lib/privileges';
import type { BusinessType, PartnerBusinessType, UserRole } from '@/types/UserProfile';

export type UserMetadataRow = {
  id: string;
  user_role: UserRole;
  privileges: BusinessType[];
  membership_level: number;
};

export const USER_METADATA_SELECT = 'id, user_role, privileges, membership_level';

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
    ((data as UserMetadataRow[] | null) ?? []).map((row) => [
      row.id,
      {
        ...row,
        privileges: parsePrivileges(row.privileges),
      },
    ]),
  );
}

export async function fetchUsersWithPrivilege(
  privilege: PartnerBusinessType,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_metadata')
    .select('id')
    .contains('privileges', [privilege]);

  if (error) throw error;

  return ((data as { id: string }[] | null) ?? []).map((row) => row.id);
}

export async function fetchUsersMissingPrivilege(
  privilege: PartnerBusinessType,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_metadata')
    .select('id')
    .not('privileges', 'cs', `{${privilege}}`);

  if (error) throw error;

  return ((data as { id: string }[] | null) ?? []).map((row) => row.id);
}

export async function fetchUsersWithAnyPortalPartnerPrivilege(): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_metadata')
    .select('id, privileges');

  if (error) throw error;

  return ((data as { id: string; privileges: unknown }[] | null) ?? [])
    .filter((row) =>
      PORTAL_PARTNER_PRIVILEGES.some((privilege) =>
        parsePrivileges(row.privileges).includes(privilege),
      ),
    )
    .map((row) => row.id);
}

export async function fetchUsersWithoutPortalPartnerPrivilege(): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_metadata')
    .select('id, privileges');

  if (error) throw error;

  return ((data as { id: string; privileges: unknown }[] | null) ?? [])
    .filter(
      (row) =>
        !PORTAL_PARTNER_PRIVILEGES.some((privilege) =>
          parsePrivileges(row.privileges).includes(privilege),
        ),
    )
    .map((row) => row.id);
}

export async function updateUserMetadata(
  userId: string,
  updates: Partial<
    Pick<UserMetadataRow, 'user_role' | 'privileges' | 'membership_level'>
  >,
): Promise<void> {
  const { error } = await supabase
    .from('user_metadata')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}
