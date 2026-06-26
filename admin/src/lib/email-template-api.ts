import supabase from '@/lib/supabase/client';
import type { EmailTemplate } from '@/types/EmailTemplate';

/** Max templates per email-template edge function batch (keep in sync with edge function). */
export const EMAIL_TEMPLATE_BATCH_MAX = 10;

export type EmailTemplateEdgeAction = 'sync' | 'delete';

export type EmailTemplateBatchItemResult = {
  name: string;
  ok: boolean;
  error?: string;
};

export type EmailTemplateBatchResponse = {
  ok?: boolean;
  error?: string;
  action?: EmailTemplateEdgeAction;
  processed?: number;
  succeeded?: number;
  failed?: number;
  results?: EmailTemplateBatchItemResult[];
};

function recordFromTemplate(
  template: EmailTemplate,
  action: EmailTemplateEdgeAction,
) {
  if (action === 'delete') {
    return { name: template.name };
  }
  return {
    name: template.name,
    subject: template.subject,
    html_body: template.html_body,
    text_body: template.text_body,
  };
}

export async function invokeEmailTemplateEdgeBatch(
  action: EmailTemplateEdgeAction,
  templates: EmailTemplate[],
): Promise<EmailTemplateBatchResponse> {
  if (templates.length === 0) {
    throw new Error('Select at least one template.');
  }
  if (templates.length > EMAIL_TEMPLATE_BATCH_MAX) {
    throw new Error(
      `You can ${action} at most ${EMAIL_TEMPLATE_BATCH_MAX} templates per batch.`,
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to sync templates.');
  }

  const { data, error } = await supabase.functions.invoke('email-template', {
    body: {
      action,
      records: templates.map((t) => recordFromTemplate(t, action)),
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Edge function request failed.');
  }

  const response = data as EmailTemplateBatchResponse | null;
  if (response?.error) {
    throw new Error(response.error);
  }

  return response ?? { ok: true, processed: templates.length, succeeded: templates.length, failed: 0 };
}

export function chunkEmailTemplates<T>(
  items: T[],
  batchSize = EMAIL_TEMPLATE_BATCH_MAX,
): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize));
  }
  return chunks;
}

export type EmailTemplateBatchProgress = {
  processed: number;
  total: number;
  batch: number;
  batchCount: number;
};

export async function invokeEmailTemplateEdgeBatched(
  action: EmailTemplateEdgeAction,
  templates: EmailTemplate[],
  onProgress?: (progress: EmailTemplateBatchProgress) => void,
): Promise<EmailTemplateBatchResponse> {
  if (templates.length === 0) {
    throw new Error('Select at least one template.');
  }

  const chunks = chunkEmailTemplates(templates);
  let succeeded = 0;
  let failed = 0;
  const results: EmailTemplateBatchItemResult[] = [];

  for (let i = 0; i < chunks.length; i += 1) {
    onProgress?.({
      processed: i * EMAIL_TEMPLATE_BATCH_MAX,
      total: templates.length,
      batch: i + 1,
      batchCount: chunks.length,
    });

    const result = await invokeEmailTemplateEdgeBatch(action, chunks[i]);
    succeeded += result.succeeded ?? 0;
    failed += result.failed ?? 0;
    if (result.results) {
      results.push(...result.results);
    }

    onProgress?.({
      processed: Math.min((i + 1) * EMAIL_TEMPLATE_BATCH_MAX, templates.length),
      total: templates.length,
      batch: i + 1,
      batchCount: chunks.length,
    });
  }

  return {
    ok: failed === 0,
    action,
    processed: templates.length,
    succeeded,
    failed,
    results,
  };
}

export async function invokeEmailTemplateEdge(
  action: EmailTemplateEdgeAction,
  template: EmailTemplate,
): Promise<EmailTemplateBatchResponse> {
  return invokeEmailTemplateEdgeBatch(action, [template]);
}
