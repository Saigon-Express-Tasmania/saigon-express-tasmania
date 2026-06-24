import {
  PENDING_FRANCHISE_INTEREST_SELECT,
  type PendingFranchiseInterest,
} from '@/lib/pending-franchise-interests';
import supabase from '@/lib/supabase/client';

export async function fetchApprovedFranchiseInterests(): Promise<
  PendingFranchiseInterest[]
> {
  const { data, error } = await supabase
    .from('franchise_interests')
    .select(PENDING_FRANCHISE_INTEREST_SELECT)
    .eq('interest_type', 'franchise')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PendingFranchiseInterest[];
}

export async function deleteFranchiseInterest(id: number): Promise<void> {
  const { error } = await supabase
    .from('franchise_interests')
    .delete()
    .eq('id', id)
    .eq('interest_type', 'franchise');

  if (error) throw error;
}
