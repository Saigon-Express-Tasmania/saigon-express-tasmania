import { sendEmail } from "./send-email/index.ts";
import { createServiceClient } from "./supabase.ts";

const WHOLESALE_INQUIRY_TEMPLATE = "new_wholesale_inquiry";
const ORDER_NOTIFY_EMAIL_SETTING = "order_notify_email";
const ADMIN_FRANCHISE_INTERESTS_URL_SETTING = "admin_franchise_interests_url";
const DEFAULT_SENDER_EMAIL = "info@saigonexpress.com.au";
const DEFAULT_SENDER_NAME = "Saigon Express Tasmania";

type WholesaleInquiryRow = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  business_type: string | null;
  estimated_weekly_volume: string | null;
  message: string | null;
  created_at: string;
};

type EmailTemplateRow = {
  subject: string;
  html_body: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseRecipientEmails(value: string): string[] {
  return [...new Set(
    value
      .split(/[,;]/)
      .map((email) => email.trim())
      .filter((email) => isValidEmail(email)),
  )];
}

function displayValue(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const text = String(value).trim();
  return text || "—";
}

function formatSubmittedAt(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Hobart",
  }).format(new Date(parsed));
}

function buildAdminInterestUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  return `${trimmed}/wholesale_enquiries`;
}

async function fetchWholesaleInquiryTemplate(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<EmailTemplateRow | null> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_body")
    .eq("name", WHOLESALE_INQUIRY_TEMPLATE)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load ${WHOLESALE_INQUIRY_TEMPLATE} template: ${error.message}`,
    );
  }

  return (data as EmailTemplateRow | null) ?? null;
}

async function fetchWholesaleInquiry(
  supabase: ReturnType<typeof createServiceClient>,
  inquiryId: number,
): Promise<WholesaleInquiryRow | null> {
  const { data, error } = await supabase
    .from("franchise_interests")
    .select(
      "id, full_name, email, phone, business_name, business_type, estimated_weekly_volume, message, created_at",
    )
    .eq("id", inquiryId)
    .eq("interest_type", "wholesale_enquiry")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load wholesale inquiry #${inquiryId}: ${error.message}`);
  }

  return (data as WholesaleInquiryRow | null) ?? null;
}

async function fetchSettingsByKeys(
  supabase: ReturnType<typeof createServiceClient>,
  keys: string[],
): Promise<Record<string, string>> {
  const trimmedKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  if (trimmedKeys.length === 0) return {};

  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", trimmedKeys);

  if (error) {
    throw new Error(`Failed to load settings: ${error.message}`);
  }

  return (data ?? []).reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function sendWholesaleInquiryNotifyEmail(
  inquiryId: number,
): Promise<void> {
  const supabase = createServiceClient();
  const inquiry = await fetchWholesaleInquiry(supabase, inquiryId);

  if (!inquiry) {
    console.warn(
      `[wholesale-inquiry] Wholesale inquiry #${inquiryId} not found; skipping email`,
    );
    return;
  }

  const settings = await fetchSettingsByKeys(supabase, [
    ORDER_NOTIFY_EMAIL_SETTING,
    ADMIN_FRANCHISE_INTERESTS_URL_SETTING,
  ]);

  const recipientEmails = parseRecipientEmails(
    settings[ORDER_NOTIFY_EMAIL_SETTING]?.trim() ?? "",
  );

  if (recipientEmails.length === 0) {
    console.warn(
      `[wholesale-inquiry] Setting ${ORDER_NOTIFY_EMAIL_SETTING} is missing or invalid; skipping`,
    );
    return;
  }

  const adminInterestsBaseUrl =
    settings[ADMIN_FRANCHISE_INTERESTS_URL_SETTING]?.trim() ?? "";
  if (!adminInterestsBaseUrl) {
    console.warn(
      `[wholesale-inquiry] Setting ${ADMIN_FRANCHISE_INTERESTS_URL_SETTING} is missing; admin link will be empty`,
    );
  }

  const template = await fetchWholesaleInquiryTemplate(supabase);
  if (!template?.html_body?.trim()) {
    throw new Error(`Email template ${WHOLESALE_INQUIRY_TEMPLATE} not found`);
  }

  const templateVariables: Record<string, string | number | boolean> = {
    submissionId: inquiry.id,
    submittedAt: formatSubmittedAt(inquiry.created_at),
    businessName: displayValue(inquiry.business_name),
    contactName: inquiry.full_name,
    email: inquiry.email,
    phone: displayValue(inquiry.phone),
    businessType: displayValue(inquiry.business_type),
    estimatedWeeklyVolume: displayValue(inquiry.estimated_weekly_volume),
    message: displayValue(inquiry.message),
    adminInterestUrl: buildAdminInterestUrl(adminInterestsBaseUrl),
  };

  await sendEmail({
    senderEmail: DEFAULT_SENDER_EMAIL,
    senderName: DEFAULT_SENDER_NAME,
    recipientEmails,
    templateId: WHOLESALE_INQUIRY_TEMPLATE,
    templateVarialbles: templateVariables,
  });

  console.log(
    `[wholesale-inquiry] Sent ${WHOLESALE_INQUIRY_TEMPLATE} for inquiry #${inquiryId} to ${recipientEmails.join(", ")}`,
  );
}
