import supabase from '@/lib/supabase/client';
import {
  type InterestStatus,
  pendingFranchiseInterestsRemainingMessage,
} from '@/lib/pending-franchise-interests';

export type { InterestStatus };
export { pendingFranchiseInterestsRemainingMessage as pendingWholesaleEnquiriesRemainingMessage };

export type PendingWholesaleEnquiry = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  business_type: string | null;
  estimated_weekly_volume: string | null;
  message: string | null;
  status: InterestStatus;
  created_at: string;
};

export const DASHBOARD_PENDING_WHOLESALE_ENQUIRIES_LIMIT = 10;

export const PENDING_WHOLESALE_ENQUIRY_SELECT =
  'id, full_name, email, phone, business_name, business_type, estimated_weekly_volume, message, status, created_at';

export async function fetchPendingWholesaleEnquiries(input: {
  limit: number;
}): Promise<{ items: PendingWholesaleEnquiry[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from('franchise_interests')
    .select(PENDING_WHOLESALE_ENQUIRY_SELECT, { count: 'exact' })
    .eq('interest_type', 'wholesale_enquiry')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(input.limit);

  if (error) throw error;

  return {
    items: (data ?? []) as PendingWholesaleEnquiry[],
    totalCount: count ?? 0,
  };
}

export async function updateWholesaleEnquiryStatus(
  id: number,
  status: InterestStatus,
): Promise<PendingWholesaleEnquiry> {
  const { data, error } = await supabase
    .from('franchise_interests')
    .update({ status })
    .eq('id', id)
    .eq('interest_type', 'wholesale_enquiry')
    .select(PENDING_WHOLESALE_ENQUIRY_SELECT)
    .single();

  if (error) throw error;
  return data as PendingWholesaleEnquiry;
}
