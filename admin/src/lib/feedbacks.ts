import supabase from '@/lib/supabase/client';
import type { Feedback, FeedbackStatus } from '@/types/Feedback';

export const DASHBOARD_PENDING_FEEDBACKS_LIMIT = 10;

export function statusBadgeVariant(
  status: FeedbackStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'resolved':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function truncateFeedbackText(text: string, max = 80): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function formatFeedbackDate(value: string): string {
  return new Date(value).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function pendingFeedbacksRemainingMessage(
  shownCount: number,
  totalCount: number,
): string | null {
  if (totalCount <= shownCount) return null;
  const remaining = totalCount - shownCount;
  return `${remaining} more unresolved ${remaining === 1 ? 'submission' : 'submissions'} not shown.`;
}

export async function fetchUnresolvedFeedbacks(input: {
  limit: number;
}): Promise<{ items: Feedback[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from('feedbacks')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(input.limit);

  if (error) throw error;

  return {
    items: (data ?? []) as Feedback[],
    totalCount: count ?? 0,
  };
}

export async function updateFeedbackStatus(
  feedbackId: number,
  status: FeedbackStatus,
): Promise<Feedback> {
  const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('feedbacks')
    .update({ status, resolved_at: resolvedAt })
    .eq('id', feedbackId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Feedback;
}
