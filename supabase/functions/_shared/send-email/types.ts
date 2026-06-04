export type SendEmailOptions = {
  method?: "ses" | "mailtrap";
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  cc?: string[];
  bcc?: string[];
  templateId: string;
  templateVarialbles: Record<string, string | number | boolean>;
};

export type SendEmailResult = {
  messageId?: string;
  success?: boolean;
};
