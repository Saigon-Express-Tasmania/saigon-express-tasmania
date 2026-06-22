import { sendEmail } from "./send-email/index.ts";
import { createServiceClient } from "./supabase.ts";

const CONTACT_NOTIFY_TEMPLATE = "contact_notify";
const ORDER_NOTIFY_EMAIL_SETTING = "order_notify_email";
const ADMIN_FRANCHISE_INTERESTS_URL_SETTING = "admin_franchise_interests_url";
const DEFAULT_SENDER_EMAIL = "info@saigonexpress.com.au";
const DEFAULT_SENDER_NAME = "Saigon Express Tasmania";

type FranchiseInterestType = "franchise" | "consultation" | "catering_enquiry";

type FranchiseInterestRow = {
  id: number;
  interest_type: FranchiseInterestType;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  business_name: string | null;
  investment_budget: string | null;
  business_experience: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  event_date: string | null;
  guest_count: number | null;
  message: string | null;
  created_at: string;
};

type EmailTemplateRow = {
  subject: string;
  html_body: string;
};

const INTEREST_TYPE_LABELS: Record<FranchiseInterestType, string> = {
  franchise: "Franchise interest",
  consultation: "Consultation booking",
  catering_enquiry: "Catering enquiry",
};

const INTEREST_TYPE_ADMIN_PATHS: Record<FranchiseInterestType, string> = {
  franchise: "franchise",
  consultation: "consultation",
  catering_enquiry: "catering_enquiries",
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

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeZone: "Australia/Hobart",
  }).format(new Date(parsed));
}

function buildAdminInterestUrl(
  baseUrl: string,
  interestType: FranchiseInterestType,
): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  return `${trimmed}/${INTEREST_TYPE_ADMIN_PATHS[interestType]}`;
}

async function fetchContactNotifyTemplate(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<EmailTemplateRow | null> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_body")
    .eq("name", CONTACT_NOTIFY_TEMPLATE)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load ${CONTACT_NOTIFY_TEMPLATE} template: ${error.message}`,
    );
  }

  return (data as EmailTemplateRow | null) ?? null;
}

async function fetchFranchiseInterest(
  supabase: ReturnType<typeof createServiceClient>,
  interestId: number,
): Promise<FranchiseInterestRow | null> {
  const { data, error } = await supabase
    .from("franchise_interests")
    .select(
      "id, interest_type, full_name, email, phone, city, state, business_name, investment_budget, business_experience, preferred_date, preferred_time, event_date, guest_count, message, created_at",
    )
    .eq("id", interestId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load franchise interest #${interestId}: ${error.message}`);
  }

  return (data as FranchiseInterestRow | null) ?? null;
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

export async function sendContactNotifyEmail(interestId: number): Promise<void> {
  const supabase = createServiceClient();
  const interest = await fetchFranchiseInterest(supabase, interestId);

  if (!interest) {
    console.warn(`[contact-notify] Franchise interest #${interestId} not found; skipping email`);
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
      `[contact-notify] Setting ${ORDER_NOTIFY_EMAIL_SETTING} is missing or invalid; skipping`,
    );
    return;
  }

  const adminInterestsBaseUrl =
    settings[ADMIN_FRANCHISE_INTERESTS_URL_SETTING]?.trim() ?? "";
  if (!adminInterestsBaseUrl) {
    console.warn(
      `[contact-notify] Setting ${ADMIN_FRANCHISE_INTERESTS_URL_SETTING} is missing; admin link will be empty`,
    );
  }

  const template = await fetchContactNotifyTemplate(supabase);
  if (!template?.html_body?.trim()) {
    throw new Error(`Email template ${CONTACT_NOTIFY_TEMPLATE} not found`);
  }

  const interestTypeLabel = INTEREST_TYPE_LABELS[interest.interest_type];
  const templateVariables: Record<string, string | number | boolean> = {
    submissionId: interest.id,
    interestType: interest.interest_type,
    interestTypeLabel,
    submittedAt: formatSubmittedAt(interest.created_at),
    fullName: interest.full_name,
    email: interest.email,
    phone: displayValue(interest.phone),
    city: displayValue(interest.city),
    state: displayValue(interest.state),
    businessName: displayValue(interest.business_name),
    investmentBudget: displayValue(interest.investment_budget),
    businessExperience: displayValue(interest.business_experience),
    preferredDate: formatDateOnly(interest.preferred_date),
    preferredTime: displayValue(interest.preferred_time),
    eventDate: formatDateOnly(interest.event_date),
    guestCount: displayValue(interest.guest_count),
    message: displayValue(interest.message),
    adminInterestUrl: buildAdminInterestUrl(
      adminInterestsBaseUrl,
      interest.interest_type,
    ),
  };

  await sendEmail({
    senderEmail: DEFAULT_SENDER_EMAIL,
    senderName: DEFAULT_SENDER_NAME,
    recipientEmails,
    templateId: CONTACT_NOTIFY_TEMPLATE,
    templateVarialbles: templateVariables,
  });

  console.log(
    `[contact-notify] Sent ${CONTACT_NOTIFY_TEMPLATE} for ${interestTypeLabel} #${interestId} to ${recipientEmails.join(", ")}`,
  );
}
