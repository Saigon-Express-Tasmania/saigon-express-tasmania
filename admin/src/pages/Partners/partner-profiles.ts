import { normalizePartnerPrivileges } from './partner-privilege-form';
import { invokeSendEmail } from '@/lib/send-email-api';
import { fetchSettingsByKeys } from '@/lib/settings';
import supabase from '@/lib/supabase/client';
import {
  hasAnyPortalPartnerPrivilege,
  mergePrivileges,
  revokePrivilege,
} from '@/lib/privileges';
import {
  fetchUserMetadataByIds,
  fetchUsersEmailVerified,
  fetchUsersWithAnyPortalPartnerPrivilege,
  fetchUsersWithoutPortalPartnerPrivilege,
  updateUserMetadata,
} from '@/lib/user-metadata';
import type { BusinessType, PartnerBusinessType, UserProfile, UserRole } from '@/types/UserProfile';

export type PendingPartnerProfile = UserProfile & {
  email_verified: boolean;
};

export const DASHBOARD_PENDING_PARTNERS_LIMIT = 10;
export const PARTNERS_PAGE_PENDING_LIMIT = 25;

export const PENDING_PARTNER_PROFILE_SELECT =
  'id, email, first_name, last_name, display_name, phone, business_name, created_at';

export const PARTNER_PROFILE_SELECT =
  'id, email, first_name, last_name, display_name, phone, address_line1, address_line2, city, suburb, state, postal_code, country, business_name, abn, business_category, date_of_birth, created_at, updated_at';

const WHOLESALE_ACCOUNT_CONFIRMATION_TEMPLATE = 'wholesale_account_confirmation';
const WHOLESALE_PORTAL_URL = 'https://saigonexpress.com.au/wholesale';

type ConfirmPartnerWithPrivilegesInput = Pick<
  UserProfile,
  | 'id'
  | 'user_role'
  | 'privileges'
  | 'email'
  | 'business_name'
  | 'display_name'
  | 'first_name'
  | 'last_name'
>;

type PartnerProfileRow = Omit<
  UserProfile,
  'user_role' | 'privileges' | 'membership_level'
>;

function mergePartnerProfile(
  profile: PartnerProfileRow,
  metadata:
    | { user_role: UserRole; privileges: BusinessType[]; membership_level: number }
    | undefined,
): UserProfile {
  return {
    ...profile,
    user_role: metadata?.user_role ?? 'user',
    privileges: metadata?.privileges ?? ['personal'],
    membership_level: metadata?.membership_level ?? 0,
  };
}

export function partnerDisplayName(
  profile: Pick<
    UserProfile,
    'display_name' | 'first_name' | 'last_name' | 'business_name' | 'email'
  >,
): string {
  return (
    profile.display_name?.trim() ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.business_name?.trim() ||
    profile.email ||
    'Unknown'
  );
}

export function formatPartnerDate(value: string): string {
  return new Date(value).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function pendingPartnersRemainingMessage(
  shownCount: number,
  totalCount: number,
): string | null {
  if (totalCount <= shownCount) return null;
  const remaining = totalCount - shownCount;
  return `${remaining} more pending ${remaining === 1 ? 'registration' : 'registrations'} not shown.`;
}

export function getPartnerConfirmUpdates(
  businessType: PartnerBusinessType,
  currentPrivileges: BusinessType[],
): { privileges: BusinessType[]; user_role?: 'partner' } {
  const privileges = mergePrivileges(currentPrivileges, businessType);
  return businessType === 'wholesale'
    ? { privileges, user_role: 'partner' }
    : { privileges };
}

export async function confirmPartnerProfile(
  partner: Pick<UserProfile, 'id' | 'privileges'>,
  businessType: PartnerBusinessType = 'wholesale',
): Promise<void> {
  await updateUserMetadata(
    partner.id,
    getPartnerConfirmUpdates(businessType, partner.privileges),
  );

  const { error: syncError } = await supabase.rpc('sync_user_auth_metadata', {
    target_user_id: partner.id,
  });

  if (syncError) throw syncError;
}

export function getConfirmMetadataFromPrivileges(
  currentRole: UserRole,
  selectedPrivileges: BusinessType[],
): { privileges: BusinessType[]; user_role: UserRole } {
  const privileges = normalizePartnerPrivileges(selectedPrivileges);
  let user_role = currentRole;

  if (privileges.includes('wholesale') && user_role === 'user') {
    user_role = 'partner';
  } else if (!privileges.includes('wholesale') && user_role === 'partner') {
    user_role = 'user';
  }

  return { user_role, privileges };
}

async function sendWholesaleAccountConfirmationEmail(
  partner: Pick<
    UserProfile,
    'email' | 'business_name' | 'display_name' | 'first_name' | 'last_name'
  >,
): Promise<void> {
  const recipientEmail = partner.email?.trim();
  if (!recipientEmail) {
    throw new Error(
      'Partner email is required to send wholesale account confirmation.',
    );
  }

  const settings = await fetchSettingsByKeys([
    'contact_us_email',
    'contact_us_phone_number',
  ]);

  await invokeSendEmail({
    to: recipientEmail,
    templateId: WHOLESALE_ACCOUNT_CONFIRMATION_TEMPLATE,
    templateVariables: {
      business_name: partner.business_name?.trim() ?? '',
      contact_email: settings.contact_us_email?.trim() ?? '',
      contact_phone: settings.contact_us_phone_number?.trim() ?? '',
      customer_name: partnerDisplayName(partner),
      wholesale_url: WHOLESALE_PORTAL_URL,
    },
  });
}

export async function confirmPartnerWithPrivileges(
  partner: ConfirmPartnerWithPrivilegesInput,
  selectedPrivileges: BusinessType[],
): Promise<void> {
  const privileges = normalizePartnerPrivileges(selectedPrivileges);

  await updateUserMetadata(
    partner.id,
    getConfirmMetadataFromPrivileges(partner.user_role, privileges),
  );

  const { error: syncError } = await supabase.rpc('sync_user_auth_metadata', {
    target_user_id: partner.id,
  });

  if (syncError) throw syncError;

  if (privileges.includes('wholesale')) {
    await sendWholesaleAccountConfirmationEmail(partner);
  }
}

export async function fetchPendingPartners(input: {
  limit: number;
}): Promise<{ items: PendingPartnerProfile[]; totalCount: number }> {
  const missingPortalIds = await fetchUsersWithoutPortalPartnerPrivilege();
  if (missingPortalIds.length === 0) {
    return { items: [], totalCount: 0 };
  }

  const { data, error, count } = await supabase
    .from('user_profiles')
    .select(PENDING_PARTNER_PROFILE_SELECT, { count: 'exact' })
    .in('id', missingPortalIds)
    .not('business_name', 'is', null)
    .neq('business_name', '')
    .order('created_at', { ascending: false })
    .limit(input.limit);

  if (error) throw error;

  const profiles = (data as PartnerProfileRow[] | null) ?? [];
  const profileIds = profiles.map((profile) => profile.id);
  const [metadataById, emailVerifiedById] = await Promise.all([
    fetchUserMetadataByIds(profileIds),
    fetchUsersEmailVerified(profileIds),
  ]);

  return {
    items: profiles.map((profile) => ({
      ...mergePartnerProfile(profile, metadataById.get(profile.id)),
      email_verified: emailVerifiedById.get(profile.id) ?? false,
    })),
    totalCount: count ?? 0,
  };
}

export async function fetchConfirmedPartners(): Promise<UserProfile[]> {
  const privilegedIds = await fetchUsersWithAnyPortalPartnerPrivilege();
  if (privilegedIds.length === 0) return [];

  const { data, error } = await supabase
    .from('user_profiles')
    .select(PARTNER_PROFILE_SELECT)
    .in('id', privilegedIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const profiles = (data as PartnerProfileRow[] | null) ?? [];
  const metadataById = await fetchUserMetadataByIds(profiles.map((profile) => profile.id));

  return profiles
    .map((profile) => mergePartnerProfile(profile, metadataById.get(profile.id)))
    .filter((profile) => hasAnyPortalPartnerPrivilege(profile.privileges));
}

export function setPartnerPortalAccess(
  currentPrivileges: BusinessType[],
  businessType: PartnerBusinessType,
  granted: boolean,
): { privileges: BusinessType[]; user_role?: UserRole } {
  if (granted) {
    return getPartnerConfirmUpdates(businessType, currentPrivileges);
  }

  return {
    privileges: revokePrivilege(currentPrivileges, businessType),
    user_role: businessType === 'wholesale' ? 'user' : undefined,
  };
}
