import supabase from '@/lib/supabase/client';
import type { PartnerBusinessType, UserProfile } from '@/types/UserProfile';

export const DASHBOARD_PENDING_PARTNERS_LIMIT = 10;
export const PARTNERS_PAGE_PENDING_LIMIT = 25;

export const PENDING_PARTNER_SELECT =
  'id, email, first_name, last_name, display_name, phone, business_name, business_type, created_at, is_verified';

export const PARTNER_SELECT =
  'id, email, first_name, last_name, display_name, phone, address_line1, address_line2, city, suburb, state, postal_code, country, business_name, abn, business_category, business_type, user_role, is_verified, date_of_birth, created_at, updated_at';

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
  const { error } = await supabase
    .from('user_profiles')
    .update(getPartnerConfirmUpdates(partner.business_type))
    .eq('id', partner.id);

  if (error) throw error;
}

export async function fetchPendingPartners(input: {
  businessType: PartnerBusinessType;
  limit: number;
}): Promise<{ items: UserProfile[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from('user_profiles')
    .select(PENDING_PARTNER_SELECT, { count: 'exact' })
    .eq('business_type', input.businessType)
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
    .limit(input.limit);

  if (error) throw error;

  return {
    items: (data as UserProfile[] | null) ?? [],
    totalCount: count ?? 0,
  };
}

export async function fetchConfirmedPartners(
  businessType: PartnerBusinessType,
): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(PARTNER_SELECT)
    .eq('business_type', businessType)
    .eq('is_verified', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as UserProfile[] | null) ?? [];
}
