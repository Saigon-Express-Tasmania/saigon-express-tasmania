import supabase from '@/lib/supabase/client';
import { parseEmailAddressList } from '@/lib/email-template-preview';

export type SendEmailPayload = {
  method?: 'ses' | 'mailtrap';
  senderEmail?: string;
  senderName?: string;
  to: string;
  cc?: string;
  bcc?: string;
  templateId: string;
  templateVariables?: Record<string, string | number | boolean>;
};

export type SendEmailResponse = {
  success?: boolean;
  messageId?: string;
  error?: string;
};

export async function invokeSendEmail(
  payload: SendEmailPayload,
): Promise<SendEmailResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to send email.');
  }

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      method: payload.method,
      senderEmail: payload.senderEmail?.trim() || undefined,
      senderName: payload.senderName?.trim() || undefined,
      to: payload.to.trim(),
      cc: parseEmailAddressList(payload.cc ?? ''),
      bcc: parseEmailAddressList(payload.bcc ?? ''),
      templateId: payload.templateId,
      templateVariables: payload.templateVariables ?? {},
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email.');
  }

  const response = data as SendEmailResponse | null;
  if (response?.error) {
    throw new Error(response.error);
  }

  return response ?? { success: true };
}
