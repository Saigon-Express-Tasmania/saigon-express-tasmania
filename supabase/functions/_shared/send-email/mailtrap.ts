import { getMailtrapApiToken } from "../secrets/mailtrap-secrets.ts";
import type { SendEmailOptions, SendEmailResult } from "./types.ts";

const MAILTRAP_SEND_URL = "https://send.api.mailtrap.io/api/send";

type MailtrapSendResponse = {
  success?: boolean;
  message_ids?: string[];
};

export async function sendEmailWithMailtrap(opts: SendEmailOptions): Promise<SendEmailResult> {
  console.log(
    `[send-email:mailtrap] Sending template ${opts.templateId} to ${opts.recipientEmail}`,
  );

  const response = await fetch(MAILTRAP_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMailtrapApiToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: {
        email: opts.senderEmail,
        name: opts.senderName,
      },
      to: [{ email: opts.recipientEmail }],
      ...(opts.cc?.length
        ? { cc: opts.cc.map((email) => ({ email })) }
        : {}),
      ...(opts.bcc?.length
        ? { bcc: opts.bcc.map((email) => ({ email })) }
        : {}),
      template_uuid: opts.templateId,
      template_variables: opts.templateVarialbles,
    }),
  });

  const body = await response.text();
  let parsed: MailtrapSendResponse | null = null;
  if (body) {
    try {
      parsed = JSON.parse(body) as MailtrapSendResponse;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const detail = body || response.statusText;
    console.error(`[send-email:mailtrap] Request failed (${response.status}):`, detail);
    throw new Error(`Mailtrap send failed (${response.status}): ${detail}`);
  }

  const messageId = parsed?.message_ids?.[0];
  console.log(
    `[send-email:mailtrap] Sent${messageId ? ` (id: ${messageId})` : ""}: success=${parsed?.success ?? true}`,
  );

  return {
    success: parsed?.success ?? true,
    messageId,
  };
}
