export type FeedbackSource = 'faq';

export type Feedback = {
  id: number;
  name: string;
  email: string | null;
  question: string;
  source: FeedbackSource;
  ip_hash: string;
  created_at: string;
};

export type FeedbackInput = {
  name: string;
  email: string | null;
  question: string;
  source: FeedbackSource;
  ip_hash: string;
  created_at: string;
};

export const emptyFeedbackInput = (): FeedbackInput => ({
  name: '',
  email: null,
  question: '',
  source: 'faq',
  ip_hash: 'admin',
  created_at: new Date().toISOString(),
});

export function feedbackToInput(feedback: Feedback): FeedbackInput {
  return {
    name: feedback.name,
    email: feedback.email,
    question: feedback.question,
    source: feedback.source,
    ip_hash: feedback.ip_hash,
    created_at: feedback.created_at,
  };
}
