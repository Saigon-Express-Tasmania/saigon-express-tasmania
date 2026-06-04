import {
  CreateTemplateCommand,
  DeleteTemplateCommand,
  SESClient,
  SendTemplatedEmailCommand,
  UpdateTemplateCommand,
} from "npm:@aws-sdk/client-ses@3.758.0";
import { getAwsCredentials, getAwsRegion } from "../secrets/aws-secrets.ts";
import type { SendEmailOptions, SendEmailResult } from "./types.ts";

export type SesEmailTemplateInput = {
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
};

function createSesClient(): SESClient {
  const credentials = getAwsCredentials();
  return new SESClient({
    region: getAwsRegion(),
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
}

function formatSesSource(email: string, name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) return email;
  return `${trimmedName} <${email}>`;
}

function sesTemplatePayload(input: SesEmailTemplateInput) {
  return {
    TemplateName: input.name,
    SubjectPart: input.subject,
    HtmlPart: input.htmlBody,
    TextPart: input.textBody?.trim() || undefined,
  };
}

function isSesAlreadyExists(err: unknown): boolean {
  return err instanceof Error &&
    (err.name === "AlreadyExistsException" || err.message.includes("AlreadyExists"));
}

function isSesNotFound(err: unknown): boolean {
  return err instanceof Error &&
    (err.name === "TemplateDoesNotExistException" || err.message.includes("does not exist"));
}

export async function createSesEmailTemplate(input: SesEmailTemplateInput): Promise<void> {
  const client = createSesClient();
  const template = sesTemplatePayload(input);
  try {
    try {
      await client.send(new CreateTemplateCommand({ Template: template }));
      console.log(`[send-email:ses] Created template ${input.name}`);
    } catch (err) {
      if (!isSesAlreadyExists(err)) throw err;
      await client.send(new UpdateTemplateCommand({ Template: template }));
      console.log(`[send-email:ses] Updated existing template ${input.name}`);
    }
  } finally {
    client.destroy();
  }
}

export async function deleteSesEmailTemplate(name: string): Promise<void> {
  const client = createSesClient();
  try {
    try {
      await client.send(new DeleteTemplateCommand({ TemplateName: name }));
      console.log(`[send-email:ses] Deleted template ${name}`);
    } catch (err) {
      if (isSesNotFound(err)) {
        console.log(`[send-email:ses] Template ${name} already absent`);
        return;
      }
      throw err;
    }
  } finally {
    client.destroy();
  }
}

export async function sendEmailWithSes(opts: SendEmailOptions): Promise<SendEmailResult> {
  console.log(
    `[send-email:ses] Sending template ${opts.templateId} to ${opts.recipientEmails.join(", ")}`,
  );

  const client = createSesClient();
  const destination: {
    ToAddresses: string[];
    CcAddresses?: string[];
    BccAddresses?: string[];
  } = {
    ToAddresses: opts.recipientEmails,
  };
  if (opts.cc?.length) destination.CcAddresses = opts.cc;
  if (opts.bcc?.length) destination.BccAddresses = opts.bcc;

  const command = new SendTemplatedEmailCommand({
    Source: formatSesSource(opts.senderEmail, opts.senderName),
    Destination: destination,
    Template: opts.templateId,
    TemplateData: JSON.stringify(opts.templateVarialbles),
  });

  try {
    const response = await client.send(command);
    const messageId = response.MessageId;
    console.log(`[send-email:ses] Sent${messageId ? ` (id: ${messageId})` : ""}`);
    return { success: true, messageId };
  } finally {
    client.destroy();
  }
}
