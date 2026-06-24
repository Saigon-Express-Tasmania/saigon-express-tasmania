import supabase from '@/lib/supabase/client';

export type InterestStatus = 'pending' | 'approved' | 'rejected' | 'resolved';

export type PendingFranchiseInterest = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string;
  business_name: string | null;
  business_type: string | null;
  investment_budget: string | null;
  business_experience: string | null;
  message: string | null;
  status: InterestStatus;
  created_at: string;
};

export const DASHBOARD_PENDING_FRANCHISE_INTERESTS_LIMIT = 10;

export const PENDING_FRANCHISE_INTEREST_SELECT =
  'id, full_name, email, phone, city, state, business_name, business_type, investment_budget, business_experience, message, status, created_at';

export function formatFranchiseInterestDate(value: string): string {
  return new Date(value).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function franchiseInterestStatusBadgeClass(status: InterestStatus): string {
  switch (status) {
    case 'resolved':
      return 'bg-green-100 text-green-700 hover:bg-green-100';
    case 'approved':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
    case 'rejected':
      return 'bg-red-100 text-red-700 hover:bg-red-100';
    case 'pending':
    default:
      return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  }
}

export function pendingFranchiseInterestsRemainingMessage(
  shownCount: number,
  totalCount: number,
): string | null {
  if (totalCount <= shownCount) return null;
  const remaining = totalCount - shownCount;
  return `${remaining} more pending ${remaining === 1 ? 'submission' : 'submissions'} not shown.`;
}

export async function fetchPendingFranchiseInterests(input: {
  limit: number;
}): Promise<{ items: PendingFranchiseInterest[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from('franchise_interests')
    .select(PENDING_FRANCHISE_INTEREST_SELECT, { count: 'exact' })
    .eq('interest_type', 'franchise')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(input.limit);

  if (error) throw error;

  return {
    items: (data ?? []) as PendingFranchiseInterest[],
    totalCount: count ?? 0,
  };
}

export async function updateFranchiseInterestStatus(
  id: number,
  status: InterestStatus,
): Promise<PendingFranchiseInterest> {
  const { data, error } = await supabase
    .from('franchise_interests')
    .update({ status })
    .eq('id', id)
    .eq('interest_type', 'franchise')
    .select(PENDING_FRANCHISE_INTEREST_SELECT)
    .single();

  if (error) throw error;
  return data as PendingFranchiseInterest;
}
