import { getBrevoApiKey } from "../secrets/brevo-secrets.ts";
import { sesPlaceholdersToBrevo } from "./template-placeholders.ts";
import type { SendEmailOptions, SendEmailResult } from "./types.ts";

const BREVO_API_BASE = "https://api.brevo.com/v3";

export type BrevoEmailTemplateInput = {
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
};

type BrevoTemplateSummary = {
  id: number;
  name: string;
  tag?: string;
};

type BrevoTemplateListResponse = {
  templates?: BrevoTemplateSummary[];
};

function getDefaultSender(): { email: string; name: string } {
  return {
    email: Deno.env.get("BREVO_SENDER_EMAIL")?.trim() ||
      "info@saigonexpress.com.au",
    name: Deno.env.get("BREVO_SENDER_NAME")?.trim() ||
      "Saigon Express",
  };
}

function brevoHeaders(): Record<string, string> {
  return {
    "api-key": getBrevoApiKey(),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function brevoRequest<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${BREVO_API_BASE}${path}`, {
    ...init,
    headers: {
      ...brevoHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.text();
  let parsed: unknown = null;
  if (body) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }
  }

  if (!response.ok) {
    const message = parsed && typeof parsed === "object" && "message" in parsed
      ? String((parsed as { message: unknown }).message)
      : body || response.statusText;
    throw new Error(`Brevo API ${response.status}: ${message}`);
  }

  return parsed as T;
}

async function findTemplateIdByTag(tag: string): Promise<number | null> {
  const limit = 50;
  let offset = 0;

  while (true) {
    const result = await brevoRequest<BrevoTemplateListResponse>(
      `/smtp/templates?limit=${limit}&offset=${offset}&sort=desc`,
    );
    const templates = result.templates ?? [];

    for (const template of templates) {
      if (template.tag === tag || template.name === tag) {
        return template.id;
      }
    }

    if (templates.length < limit) break;
    offset += limit;
  }

  return null;
}

function buildBrevoTemplatePayload(input: BrevoEmailTemplateInput) {
  return {
    templateName: input.name,
    tag: input.name,
    subject: sesPlaceholdersToBrevo(input.subject),
    htmlContent: sesPlaceholdersToBrevo(input.htmlBody),
    sender: getDefaultSender(),
    isActive: true,
  };
}

export async function upsertBrevoEmailTemplate(
  input: BrevoEmailTemplateInput,
): Promise<void> {
  const payload = buildBrevoTemplatePayload(input);
  const existingId = await findTemplateIdByTag(input.name);

  if (existingId != null) {
    await brevoRequest(`/smtp/templates/${existingId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    console.log(
      `[email-template:brevo] Updated template ${input.name} (id ${existingId})`,
    );
    return;
  }

  const created = await brevoRequest<{ id?: number }>("/smtp/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(
    `[email-template:brevo] Created template ${input.name} (id ${created.id ?? "unknown"})`,
  );
}

export async function sendEmailWithBrevo(
  opts: SendEmailOptions,
): Promise<SendEmailResult> {
  const defaultSender = getDefaultSender();
  const sender = {
    email: opts.senderEmail.trim() || defaultSender.email,
    name: opts.senderName.trim() || defaultSender.name,
  };

  const to = opts.recipientEmails.map((email) => ({ email }));
  const htmlContent = opts.htmlContent?.trim();
  const subject = opts.subject?.trim();

  if (htmlContent) {
    if (!subject) {
      throw new Error("subject is required when sending pre-rendered htmlContent");
    }

    console.log(
      `[send-email:brevo] Sending rendered HTML to ${opts.recipientEmails.join(", ")}`,
    );

    const body: Record<string, unknown> = {
      sender,
      to,
      subject,
      htmlContent,
    };

    if (opts.cc?.length) {
      body.cc = opts.cc.map((email) => ({ email }));
    }
    if (opts.bcc?.length) {
      body.bcc = opts.bcc.map((email) => ({ email }));
    }

    const result = await brevoRequest<{ messageId?: string }>("/smtp/email", {
      method: "POST",
      body: JSON.stringify(body),
    });

    console.log(
      `[send-email:brevo] Sent${result.messageId ? ` (id: ${result.messageId})` : ""}`,
    );

    return { success: true, messageId: result.messageId };
  }

  const templateId = opts.templateId?.trim();
  if (!templateId) {
    throw new Error("templateId is required when htmlContent is not provided");
  }

  const brevoTemplateId = await findTemplateIdByTag(templateId);
  if (brevoTemplateId == null) {
    throw new Error(
      `Brevo template not found for "${templateId}". Sync the template first.`,
    );
  }

  console.log(
    `[send-email:brevo] Sending template ${templateId} (#${brevoTemplateId}) to ${opts.recipientEmails.join(", ")}`,
  );

  const body: Record<string, unknown> = {
    templateId: brevoTemplateId,
    params: opts.templateVarialbles ?? {},
    sender,
    to,
  };

  if (opts.cc?.length) {
    body.cc = opts.cc.map((email) => ({ email }));
  }
  if (opts.bcc?.length) {
    body.bcc = opts.bcc.map((email) => ({ email }));
  }

  const result = await brevoRequest<{ messageId?: string }>("/smtp/email", {
    method: "POST",
    body: JSON.stringify(body),
  });

  console.log(
    `[send-email:brevo] Sent${result.messageId ? ` (id: ${result.messageId})` : ""}`,
  );

  return { success: true, messageId: result.messageId };
}

export async function deleteBrevoEmailTemplate(name: string): Promise<void> {
  const existingId = await findTemplateIdByTag(name);
  if (existingId == null) {
    console.log(`[email-template:brevo] Template ${name} already absent`);
    return;
  }

  await brevoRequest(`/smtp/templates/${existingId}`, {
    method: "PUT",
    body: JSON.stringify({ isActive: false }),
  });
  await brevoRequest(`/smtp/templates/${existingId}`, {
    method: "DELETE",
  });
  console.log(
    `[email-template:brevo] Deleted template ${name} (id ${existingId})`,
  );
}
