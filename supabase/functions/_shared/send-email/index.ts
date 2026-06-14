import { sendEmailWithBrevo } from "./brevo.ts";
import { sendEmailWithSes } from "./aws-ses.ts";
import { sendEmailWithMailtrap } from "./mailtrap.ts";
import type { SendEmailOptions, SendEmailResult } from "./types.ts";

export type { SendEmailOptions, SendEmailResult };

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const method = opts.method ?? "brevo";

  switch (method) {
    case "brevo":
      return sendEmailWithBrevo(opts);
    case "ses":
      return sendEmailWithSes(opts);
    case "mailtrap":
      return sendEmailWithMailtrap(opts);
    default:
      throw new Error(`Invalid email method: ${method}`);
  }
}
