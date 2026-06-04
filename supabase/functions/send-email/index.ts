import { requireAdmin } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/send-email/index.ts";
import { isValidEmail, parseEmailList } from "../_shared/send-email/parse-emails.ts";
import type { SendEmailOptions } from "../_shared/send-email/types.ts";

const DEFAULT_SENDER_EMAIL = "info@saigonexpress.com.au";
const DEFAULT_SENDER_NAME = "Saigon Express Tasmania";

type SendEmailRequest = {
  method?: SendEmailOptions["method"];
  senderEmail?: string;
  senderName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  templateId: string;
  templateVariables?: Record<string, string | number | boolean>;
};

function parseSendEmailRequest(body: unknown): SendEmailRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;
  const templateId = String(data.templateId ?? "").trim();
  const to = parseEmailList(data.to, "to");

  if (!to.length || !templateId) {
    throw new Error("to and templateId are required");
  }

  const senderEmail = data.senderEmail != null ? String(data.senderEmail).trim() : undefined;
  if (senderEmail && !isValidEmail(senderEmail)) {
    throw new Error("senderEmail must be a valid email address");
  }

  const method = data.method != null ? String(data.method).trim() : undefined;
  if (method && method !== "ses" && method !== "mailtrap") {
    throw new Error('method must be "ses" or "mailtrap"');
  }

  const templateVariables = data.templateVariables;
  if (
    templateVariables != null &&
    (typeof templateVariables !== "object" || Array.isArray(templateVariables))
  ) {
    throw new Error("templateVariables must be an object");
  }

  const cc = parseEmailList(data.cc, "cc");
  const bcc = parseEmailList(data.bcc, "bcc");

  return {
    method: method as SendEmailOptions["method"] | undefined,
    senderEmail: senderEmail || undefined,
    senderName: data.senderName != null ? String(data.senderName).trim() : undefined,
    to,
    cc,
    bcc,
    templateId,
    templateVariables: (templateVariables ?? {}) as Record<string, string | number | boolean>,
  };
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
    const payload = parseSendEmailRequest(await req.json());

    const result = await sendEmail({
      method: payload.method,
      senderEmail: payload.senderEmail || DEFAULT_SENDER_EMAIL,
      senderName: payload.senderName || DEFAULT_SENDER_NAME,
      recipientEmails: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      templateId: payload.templateId,
      templateVarialbles: payload.templateVariables ?? {},
    });

    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("required") ||
        message.includes("must be") ||
        message.includes("Invalid request") ||
        message.includes("invalid email")
      ? 400
      : 500;
    console.error(`[send-email] Error (admin ${auth.userId}):`, err);
    return jsonResponse({ error: message }, status);
  }
});
