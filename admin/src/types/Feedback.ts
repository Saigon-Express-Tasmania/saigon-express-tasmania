export type FeedbackSource = 'faq';

export type FeedbackStatus = 'pending' | 'approved' | 'resolved' | 'rejected';

export const FEEDBACK_STATUS_OPTIONS: FeedbackStatus[] = [
  'pending',
  'approved',
  'resolved',
  'rejected',
];

export type Feedback = {
  id: number;
  name: string;
  email: string | null;
  question: string;
  source: FeedbackSource;
  ip_hash: string;
  status: FeedbackStatus;
  created_at: string;
  resolved_at: string | null;
};

export type FeedbackInput = {
  name: string;
  email: string | null;
  question: string;
  source: FeedbackSource;
  ip_hash: string;
  status: FeedbackStatus;
  created_at: string;
  resolved_at: string | null;
};

export const emptyFeedbackInput = (): FeedbackInput => ({
  name: '',
  email: null,
  question: '',
  source: 'faq',
  ip_hash: 'admin',
  status: 'pending',
  created_at: new Date().toISOString(),
  resolved_at: null,
});

export function feedbackToInput(feedback: Feedback): FeedbackInput {
  return {
    name: feedback.name,
    email: feedback.email,
    question: feedback.question,
    source: feedback.source,
    ip_hash: feedback.ip_hash,
    status: feedback.status,
    created_at: feedback.created_at,
    resolved_at: feedback.resolved_at,
  };
}
