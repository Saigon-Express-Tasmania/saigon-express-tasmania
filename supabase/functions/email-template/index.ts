import { requireAdmin } from "../_shared/auth.ts";

import { handleCors, jsonResponse } from "../_shared/cors.ts";

import {
  deleteBrevoEmailTemplate,
  upsertBrevoEmailTemplate,
} from "../_shared/send-email/brevo.ts";

import {
  createSesEmailTemplate,
  deleteSesEmailTemplate,
} from "../_shared/send-email/aws-ses.ts";

export const MAX_BATCH_SIZE = 10;

const ENABLE_AWS_SES = false;

const ENABLE_BREVO = true;

type EmailTemplateAction = "sync" | "delete";

type EmailTemplateRecord = {
  name: string;

  subject?: string;

  html_body?: string;

  text_body?: string | null;
};

type EmailTemplateRequest = {
  action: EmailTemplateAction;

  records: EmailTemplateRecord[];
};

type BatchItemResult = {
  name: string;

  ok: boolean;

  error?: string;
};

function parseRecord(row: unknown, index: number): EmailTemplateRecord {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`records[${index}] must be an object`);
  }

  const data = row as Record<string, unknown>;

  const name = String(data.name ?? "").trim();

  if (!name) {
    throw new Error(`records[${index}].name is required`);
  }

  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    throw new Error(
      `records[${index}].name must contain only letters, numbers, underscores, and hyphens`,
    );
  }

  return {
    name,

    subject: data.subject != null ? String(data.subject) : undefined,

    html_body: data.html_body != null ? String(data.html_body) : undefined,

    text_body: data.text_body != null ? String(data.text_body) : null,
  };
}

function parseRequest(body: unknown): EmailTemplateRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  const action = String(data.action ?? "").trim();

  if (action !== "sync" && action !== "delete") {
    throw new Error('action must be "sync" or "delete"');
  }

  let rawRecords: unknown[] | null = null;

  if (Array.isArray(data.records)) {
    rawRecords = data.records;
  } else if (data.record != null) {
    rawRecords = [data.record];
  }

  if (!rawRecords || rawRecords.length === 0) {
    throw new Error("records (or record) is required");
  }

  if (rawRecords.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch cannot exceed ${MAX_BATCH_SIZE} items`);
  }

  const records = rawRecords.map((row, index) => parseRecord(row, index));

  const names = new Set<string>();

  for (const record of records) {
    if (names.has(record.name)) {
      throw new Error(`Duplicate template name in batch: ${record.name}`);
    }

    names.add(record.name);
  }

  return { action, records };
}

async function handleSync(record: EmailTemplateRecord): Promise<void> {
  const subject = record.subject?.trim();

  const htmlBody = record.html_body?.trim();

  if (!subject) {
    throw new Error(`subject is required for sync (${record.name})`);
  }

  if (!htmlBody) {
    throw new Error(`html_body is required for sync (${record.name})`);
  }

  const templateInput = {
    name: record.name,

    subject,

    htmlBody,

    textBody: record.text_body,
  };

  if (ENABLE_BREVO) {
    await upsertBrevoEmailTemplate(templateInput);
  }

  if (ENABLE_AWS_SES) {
    await createSesEmailTemplate({
      name: record.name,

      subject,

      htmlBody,

      textBody: record.text_body,
    });
  }

  if (!ENABLE_BREVO && !ENABLE_AWS_SES) {
    throw new Error("No email template provider is enabled");
  }
}

async function handleDelete(record: EmailTemplateRecord): Promise<void> {
  if (ENABLE_BREVO) {
    await deleteBrevoEmailTemplate(record.name);
  }

  if (ENABLE_AWS_SES) {
    await deleteSesEmailTemplate(record.name);
  }

  if (!ENABLE_BREVO && !ENABLE_AWS_SES) {
    throw new Error("No email template provider is enabled");
  }
}

async function processBatch(
  action: EmailTemplateAction,

  records: EmailTemplateRecord[],
): Promise<BatchItemResult[]> {
  const results: BatchItemResult[] = [];

  for (const record of records) {
    try {
      if (action === "sync") {
        await handleSync(record);
      } else {
        await handleDelete(record);
      }

      results.push({ name: record.name, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";

      results.push({ name: record.name, ok: false, error: message });
    }
  }

  return results;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);

  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await requireAdmin(req);

  if (!auth.ok) return auth.response;

  try {
    const payload = parseRequest(await req.json());

    const results = await processBatch(payload.action, payload.records);

    const succeeded = results.filter((r) => r.ok).length;

    const failed = results.length - succeeded;

    return jsonResponse({
      ok: failed === 0,

      action: payload.action,

      processed: results.length,

      succeeded,

      failed,

      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    const status =
      message.includes("required") ||
      message.includes("must be") ||
      message.includes("Invalid request") ||
      message.includes("Batch cannot exceed") ||
      message.includes("Duplicate template")
        ? 400
        : 500;

    console.error(`[email-template] Error (admin ${auth.userId}):`, err);

    return jsonResponse({ error: message }, status);
  }
});
