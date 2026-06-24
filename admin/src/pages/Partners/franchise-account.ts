import supabase from '@/lib/supabase/client';
import type { BusinessType, UserRole } from '@/types/UserProfile';

export type FranchiseAccountProfilePreview = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  state: string | null;
  business_name: string | null;
  location_address: string | null;
  investment_amount: string | null;
  country: string;
  user_role: UserRole;
  privileges: BusinessType[];
};

export type FranchiseAccountExistingUser = FranchiseAccountProfilePreview & {
  userId: string;
  city: string | null;
  business_category: string | null;
};

export type FranchiseAccountPreview = {
  franchiseInterestId: number;
  emailExists: boolean;
  alreadyHasFranchise: boolean;
  passwordRequired: boolean;
  preview: FranchiseAccountProfilePreview;
  existingUser: FranchiseAccountExistingUser | null;
};

type PartnerApiResponse = {
  userId?: string;
  created?: boolean;
  franchiseInterestId?: number;
  error?: string;
};

async function invokePartnerApi(
  body: Record<string, unknown>,
): Promise<PartnerApiResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in as an administrator.');
  }

  const { data, error } = await supabase.functions.invoke('admin-partner', {
    method: 'POST',
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Partner request failed.');
  }

  const response = data as PartnerApiResponse | null;
  if (response?.error) {
    throw new Error(response.error);
  }

  return response ?? {};
}

export async function previewFranchiseAccount(
  franchiseInterestId: number,
): Promise<FranchiseAccountPreview> {
  const result = await invokePartnerApi({
    action: 'preview-franchise-account',
    franchiseInterestId,
  });
  return result as unknown as FranchiseAccountPreview;
}

export async function completeFranchiseAccount(input: {
  franchiseInterestId: number;
  password?: string;
}): Promise<{ userId: string; created: boolean }> {
  const result = await invokePartnerApi({
    action: 'complete-franchise-account',
    franchiseInterestId: input.franchiseInterestId,
    ...(input.password ? { password: input.password } : {}),
  });

  if (!result.userId) {
    throw new Error('Franchise account was not created.');
  }

  return {
    userId: result.userId,
    created: result.created ?? false,
  };
}

export function franchiseAccountDisplayName(
  profile: Pick<
    FranchiseAccountProfilePreview,
    'first_name' | 'last_name' | 'email' | 'business_name'
  >,
): string {
  return (
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.business_name ||
    profile.email
  );
}

export function formatFranchisePrivilegeLabels(privileges: BusinessType[]): string {
  return privileges.length > 0 ? privileges.join(', ') : '—';
}
