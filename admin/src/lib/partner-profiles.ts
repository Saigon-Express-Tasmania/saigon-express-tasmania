import supabase from '@/lib/supabase/client';
import {
  fetchUnverifiedUserIds,
  fetchUserMetadataByIds,
  fetchVerifiedUserIds,
  updateUserMetadata,
} from '@/lib/user-metadata';
import type { PartnerBusinessType, UserProfile, UserRole } from '@/types/UserProfile';

export const DASHBOARD_PENDING_PARTNERS_LIMIT = 10;
export const PARTNERS_PAGE_PENDING_LIMIT = 25;

export const PENDING_PARTNER_PROFILE_SELECT =
  'id, email, first_name, last_name, display_name, phone, business_name, business_type, created_at';

export const PARTNER_PROFILE_SELECT =
  'id, email, first_name, last_name, display_name, phone, address_line1, address_line2, city, suburb, state, postal_code, country, business_name, abn, business_category, business_type, date_of_birth, created_at, updated_at';

type PartnerProfileRow = Omit<UserProfile, 'user_role' | 'is_verified'>;

function mergePartnerProfile(
  profile: PartnerProfileRow,
  metadata: { user_role: UserRole; is_verified: boolean } | undefined,
): UserProfile {
  return {
    ...profile,
    user_role: metadata?.user_role ?? 'user',
    is_verified: metadata?.is_verified ?? false,
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
  businessType: UserProfile['business_type'],
): { is_verified: true; user_role?: 'partner' } {
  return businessType === 'wholesale'
    ? { is_verified: true, user_role: 'partner' }
    : { is_verified: true };
}

export async function confirmPartnerProfile(
  partner: Pick<UserProfile, 'id' | 'business_type'>,
): Promise<void> {
  await updateUserMetadata(partner.id, getPartnerConfirmUpdates(partner.business_type));
}

export async function fetchPendingPartners(input: {
  businessType: PartnerBusinessType;
  limit: number;
}): Promise<{ items: UserProfile[]; totalCount: number }> {
  const unverifiedIds = await fetchUnverifiedUserIds();
  if (unverifiedIds.length === 0) {
    return { items: [], totalCount: 0 };
  }

  const { data, error, count } = await supabase
    .from('user_profiles')
    .select(PENDING_PARTNER_PROFILE_SELECT, { count: 'exact' })
    .eq('business_type', input.businessType)
    .in('id', unverifiedIds)
    .order('created_at', { ascending: false })
    .limit(input.limit);

  if (error) throw error;

  const profiles = (data as PartnerProfileRow[] | null) ?? [];
  const metadataById = await fetchUserMetadataByIds(profiles.map((profile) => profile.id));

  return {
    items: profiles.map((profile) =>
      mergePartnerProfile(profile, metadataById.get(profile.id)),
    ),
    totalCount: count ?? 0,
  };
}

export async function fetchConfirmedPartners(
  businessType: PartnerBusinessType,
): Promise<UserProfile[]> {
  const verifiedIds = await fetchVerifiedUserIds();
  if (verifiedIds.length === 0) return [];

  const { data, error } = await supabase
    .from('user_profiles')
    .select(PARTNER_PROFILE_SELECT)
    .eq('business_type', businessType)
    .in('id', verifiedIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const profiles = (data as PartnerProfileRow[] | null) ?? [];
  const metadataById = await fetchUserMetadataByIds(profiles.map((profile) => profile.id));

  return profiles.map((profile) =>
    mergePartnerProfile(profile, metadataById.get(profile.id)),
  );
}
