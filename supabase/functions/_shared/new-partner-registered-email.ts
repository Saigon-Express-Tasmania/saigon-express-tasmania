import { sendEmail } from "./send-email/index.ts";
import { createServiceClient } from "./supabase.ts";

const NEW_PARTNER_REGISTERED_TEMPLATE = "new_partner_registered";
const ORDER_NOTIFY_EMAIL_SETTING = "order_notify_email";
const ADMIN_PARTNERS_URL_SETTING = "admin_partners_url";
const DEFAULT_SENDER_EMAIL = "info@saigonexpress.com.au";
const DEFAULT_SENDER_NAME = "Saigon Express Tasmania";

type PortalType = "wholesale" | "warehouse";

export type NewPartnerRegisteredInput = {
  userId: string;
  portalType: PortalType;
  business_name: string;
  contactName: string;
  email: string;
  phone?: string | null;
  abn?: string | null;
  business_category?: string | null;
  address?: string | null;
  registeredAt?: string;
};

type EmailTemplateRow = {
  subject: string;
  html_body: string;
};

const PORTAL_TYPE_LABELS: Record<PortalType, string> = {
  wholesale: "Wholesale",
  warehouse: "Warehouse",
};

const BUSINESS_CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  catering: "Catering",
  retail: "Retail",
  hotel: "Hotel",
  school: "School",
  corporate: "Corporate",
  other: "Other",
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

function formatBusinessCategory(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "—";
  return BUSINESS_CATEGORY_LABELS[raw] ?? raw;
}

function formatRegisteredAt(value: string | null | undefined): string {
  if (!value) {
    return new Intl.DateTimeFormat("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Australia/Hobart",
    }).format(new Date());
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Hobart",
  }).format(new Date(parsed));
}

async function fetchNewPartnerRegisteredTemplate(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<EmailTemplateRow | null> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_body")
    .eq("name", NEW_PARTNER_REGISTERED_TEMPLATE)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load ${NEW_PARTNER_REGISTERED_TEMPLATE} template: ${error.message}`,
    );
  }

  return (data as EmailTemplateRow | null) ?? null;
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

export async function sendNewPartnerRegisteredEmail(
  input: NewPartnerRegisteredInput,
): Promise<void> {
  const supabase = createServiceClient();

  const settings = await fetchSettingsByKeys(supabase, [
    ORDER_NOTIFY_EMAIL_SETTING,
    ADMIN_PARTNERS_URL_SETTING,
  ]);

  const recipientEmails = parseRecipientEmails(
    settings[ORDER_NOTIFY_EMAIL_SETTING]?.trim() ?? "",
  );

  if (recipientEmails.length === 0) {
    console.warn(
      `[new-partner-registered] Setting ${ORDER_NOTIFY_EMAIL_SETTING} is missing or invalid; skipping`,
    );
    return;
  }

  const adminPartnerUrl = settings[ADMIN_PARTNERS_URL_SETTING]?.trim() ?? "";
  if (!adminPartnerUrl) {
    console.warn(
      `[new-partner-registered] Setting ${ADMIN_PARTNERS_URL_SETTING} is missing; admin link will be empty`,
    );
  }

  const template = await fetchNewPartnerRegisteredTemplate(supabase);
  if (!template?.html_body?.trim()) {
    throw new Error(`Email template ${NEW_PARTNER_REGISTERED_TEMPLATE} not found`);
  }

  const portalTypeLabel = PORTAL_TYPE_LABELS[input.portalType];
  const templateVariables: Record<string, string | number | boolean> = {
    userId: input.userId,
    portalType: input.portalType,
    portalTypeLabel,
    registeredAt: formatRegisteredAt(input.registeredAt),
    contactName: input.contactName.trim(),
    email: input.email.trim(),
    phone: displayValue(input.phone),
    businessName: input.business_name.trim(),
    abn: displayValue(input.abn),
    businessCategory: formatBusinessCategory(input.business_category),
    address: displayValue(input.address),
    adminPartnerUrl,
  };

  await sendEmail({
    senderEmail: DEFAULT_SENDER_EMAIL,
    senderName: DEFAULT_SENDER_NAME,
    recipientEmails,
    templateId: NEW_PARTNER_REGISTERED_TEMPLATE,
    templateVarialbles: templateVariables,
  });

  console.log(
    `[new-partner-registered] Sent ${NEW_PARTNER_REGISTERED_TEMPLATE} for ${portalTypeLabel} user ${input.userId} to ${recipientEmails.join(", ")}`,
  );
}
