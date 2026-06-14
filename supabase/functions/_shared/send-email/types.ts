export type SendEmailOptions = {
  method?: "brevo" | "ses" | "mailtrap";
  senderEmail: string;
  senderName: string;
  recipientEmails: string[];
  cc?: string[];
  bcc?: string[];
  /** Brevo template tag/name. Required unless htmlContent is provided. */
  templateId?: string;
  templateVarialbles?: Record<string, string | number | boolean>;
  /** Pre-rendered HTML body (bypasses Brevo template params; HTML is not escaped). */
  htmlContent?: string;
  /** Subject for pre-rendered sends. */
  subject?: string;
};

export type SendEmailResult = {
  messageId?: string;
  success?: boolean;
};
