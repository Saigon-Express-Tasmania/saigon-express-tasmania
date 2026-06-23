import supabase from '@/lib/supabase/client';
import type {
  JobApplication,
  JobApplicationStatus,
} from '@/types/JobApplication';

export const JOB_APPLICATION_SELECT =
  'id, job_title, job_location, store_id, legal_first_name, legal_middle_names, legal_last_name, email, phone, resume_url, resume_filename, cover_letter_url, cover_letter_filename, agree_to_terms, date_of_birth, can_work_weekends, commute_under_20_minutes, work_availability, candidate_message, status, created_at, updated_at';

export const DASHBOARD_RECENT_JOB_APPLICATIONS_LIMIT = 10;

export function buildApplicantName(
  application: Pick<
    JobApplication,
    'legal_first_name' | 'legal_middle_names' | 'legal_last_name'
  >,
): string {
  return [
    application.legal_first_name,
    application.legal_middle_names,
    application.legal_last_name,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

export function formatJobApplicationDate(value: string): string {
  return new Date(value).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatJobApplicationDateOnly(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-AU', {
    dateStyle: 'medium',
  });
}

export function jobApplicationStatusButtonClass(
  status: JobApplicationStatus,
): string {
  switch (status) {
    case 'resolved':
      return 'text-green-700 focus:text-green-700 focus:bg-green-50';
    case 'approved':
      return 'text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50';
    case 'reviewing':
      return 'text-blue-700 focus:text-blue-700 focus:bg-blue-50';
    case 'rejected':
      return 'text-red-700 focus:text-red-700 focus:bg-red-50';
    case 'pending':
    default:
      return 'text-amber-700 focus:text-amber-700 focus:bg-amber-50';
  }
}

export function jobApplicationStatusBadgeClass(
  status: JobApplicationStatus,
): string {
  switch (status) {
    case 'resolved':
      return 'bg-green-100 text-green-700 hover:bg-green-100';
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    case 'reviewing':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
    case 'rejected':
      return 'bg-red-100 text-red-700 hover:bg-red-100';
    case 'pending':
    default:
      return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  }
}

export function recentJobApplicationsRemainingMessage(
  shownCount: number,
  totalCount: number,
): string | null {
  if (totalCount <= shownCount) return null;
  const remaining = totalCount - shownCount;
  return `${remaining} more ${remaining === 1 ? 'application' : 'applications'} not shown.`;
}

export async function fetchRecentJobApplications(input: {
  limit: number;
}): Promise<{ items: JobApplication[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from('job_applications')
    .select(JOB_APPLICATION_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(input.limit);

  if (error) throw error;

  return {
    items: (data ?? []) as JobApplication[],
    totalCount: count ?? 0,
  };
}

export async function updateJobApplicationStatus(
  id: number,
  status: JobApplicationStatus,
): Promise<JobApplication> {
  const { data, error } = await supabase
    .from('job_applications')
    .update({ status })
    .eq('id', id)
    .select(JOB_APPLICATION_SELECT)
    .single();

  if (error) throw error;
  return data as JobApplication;
}
