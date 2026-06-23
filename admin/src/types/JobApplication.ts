export type JobApplicationStatus =
  | 'pending'
  | 'reviewing'
  | 'approved'
  | 'resolved'
  | 'rejected';

export const JOB_APPLICATION_STATUS_OPTIONS: JobApplicationStatus[] = [
  'pending',
  'reviewing',
  'approved',
  'resolved',
  'rejected',
];

export type JobApplication = {
  id: number;
  job_title: string;
  job_location: string | null;
  store_id: number | null;
  legal_first_name: string;
  legal_middle_names: string | null;
  legal_last_name: string;
  email: string;
  phone: string | null;
  resume_url: string | null;
  resume_filename: string | null;
  cover_letter_url: string | null;
  cover_letter_filename: string | null;
  agree_to_terms: boolean;
  date_of_birth: string | null;
  can_work_weekends: string | null;
  commute_under_20_minutes: string | null;
  work_availability: string | null;
  candidate_message: string | null;
  status: JobApplicationStatus;
  created_at: string;
  updated_at: string;
};

export type JobApplicationInput = Omit<
  JobApplication,
  'id' | 'created_at' | 'updated_at'
>;

export const emptyJobApplicationInput = (): JobApplicationInput => ({
  job_title: '',
  job_location: null,
  store_id: null,
  legal_first_name: '',
  legal_middle_names: null,
  legal_last_name: '',
  email: '',
  phone: null,
  resume_url: null,
  resume_filename: null,
  cover_letter_url: null,
  cover_letter_filename: null,
  agree_to_terms: true,
  date_of_birth: null,
  can_work_weekends: null,
  commute_under_20_minutes: null,
  work_availability: null,
  candidate_message: null,
  status: 'pending',
});

export function jobApplicationToInput(
  application: JobApplication,
): JobApplicationInput {
  return {
    job_title: application.job_title,
    job_location: application.job_location,
    store_id: application.store_id,
    legal_first_name: application.legal_first_name,
    legal_middle_names: application.legal_middle_names,
    legal_last_name: application.legal_last_name,
    email: application.email,
    phone: application.phone,
    resume_url: application.resume_url,
    resume_filename: application.resume_filename,
    cover_letter_url: application.cover_letter_url,
    cover_letter_filename: application.cover_letter_filename,
    agree_to_terms: application.agree_to_terms,
    date_of_birth: application.date_of_birth,
    can_work_weekends: application.can_work_weekends,
    commute_under_20_minutes: application.commute_under_20_minutes,
    work_availability: application.work_availability,
    candidate_message: application.candidate_message,
    status: application.status,
  };
}
