import { sendEmail } from "./send-email/index.ts";
import { createServiceClient } from "./supabase.ts";

const JOB_APPLICATION_NOTIFY_TEMPLATE = "job_application_notify";
const ORDER_NOTIFY_EMAIL_SETTING = "order_notify_email";
const ADMIN_JOB_APPLICATIONS_URL_SETTING = "admin_job_applications_url";
const DEFAULT_SENDER_EMAIL = "info@saigonexpress.com.au";
const DEFAULT_SENDER_NAME = "Saigon Express Tasmania";

type JobApplicationRow = {
  id: number;
  job_title: string;
  job_location: string | null;
  legal_first_name: string;
  legal_middle_names: string | null;
  legal_last_name: string;
  email: string;
  phone: string | null;
  resume_url: string | null;
  resume_filename: string | null;
  cover_letter_url: string | null;
  cover_letter_filename: string | null;
  date_of_birth: string | null;
  can_work_weekends: string | null;
  commute_under_20_minutes: string | null;
  work_availability: string | null;
  candidate_message: string | null;
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

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeZone: "Australia/Hobart",
  }).format(new Date(parsed));
}

function buildApplicantName(application: JobApplicationRow): string {
  return [
    application.legal_first_name,
    application.legal_middle_names,
    application.legal_last_name,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

function buildAttachmentDisplay(
  url: string | null,
  filename: string | null,
): string {
  const trimmedUrl = url?.trim();
  const trimmedName = filename?.trim();
  if (trimmedUrl) {
    return trimmedName ? `${trimmedName} — ${trimmedUrl}` : trimmedUrl;
  }
  return "—";
}

function buildAdminApplicationUrl(baseUrl: string, applicationId: number): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  return `${trimmed}/${applicationId}`;
}

async function fetchJobApplicationNotifyTemplate(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<EmailTemplateRow | null> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_body")
    .eq("name", JOB_APPLICATION_NOTIFY_TEMPLATE)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load ${JOB_APPLICATION_NOTIFY_TEMPLATE} template: ${error.message}`,
    );
  }

  return (data as EmailTemplateRow | null) ?? null;
}

async function fetchJobApplication(
  supabase: ReturnType<typeof createServiceClient>,
  applicationId: number,
): Promise<JobApplicationRow | null> {
  const { data, error } = await supabase
    .from("job_applications")
    .select(
      "id, job_title, job_location, legal_first_name, legal_middle_names, legal_last_name, email, phone, resume_url, resume_filename, cover_letter_url, cover_letter_filename, date_of_birth, can_work_weekends, commute_under_20_minutes, work_availability, candidate_message, created_at",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load job application #${applicationId}: ${error.message}`,
    );
  }

  return (data as JobApplicationRow | null) ?? null;
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

export async function sendJobApplicationNotifyEmail(
  applicationId: number,
): Promise<void> {
  const supabase = createServiceClient();
  const application = await fetchJobApplication(supabase, applicationId);

  if (!application) {
    console.warn(
      `[job-application-notify] Job application #${applicationId} not found; skipping email`,
    );
    return;
  }

  const settings = await fetchSettingsByKeys(supabase, [
    ORDER_NOTIFY_EMAIL_SETTING,
    ADMIN_JOB_APPLICATIONS_URL_SETTING,
  ]);

  const recipientEmails = parseRecipientEmails(
    settings[ORDER_NOTIFY_EMAIL_SETTING]?.trim() ?? "",
  );

  if (recipientEmails.length === 0) {
    console.warn(
      `[job-application-notify] Setting ${ORDER_NOTIFY_EMAIL_SETTING} is missing or invalid; skipping`,
    );
    return;
  }

  const adminApplicationsBaseUrl =
    settings[ADMIN_JOB_APPLICATIONS_URL_SETTING]?.trim() ?? "";
  if (!adminApplicationsBaseUrl) {
    console.warn(
      `[job-application-notify] Setting ${ADMIN_JOB_APPLICATIONS_URL_SETTING} is missing; admin link will be empty`,
    );
  }

  const template = await fetchJobApplicationNotifyTemplate(supabase);
  if (!template?.html_body?.trim()) {
    throw new Error(`Email template ${JOB_APPLICATION_NOTIFY_TEMPLATE} not found`);
  }

  const applicantName = buildApplicantName(application);
  const templateVariables: Record<string, string | number | boolean> = {
    submissionId: application.id,
    submittedAt: formatSubmittedAt(application.created_at),
    jobTitle: application.job_title,
    jobLocation: displayValue(application.job_location),
    applicantName,
    email: application.email,
    phone: displayValue(application.phone),
    dateOfBirth: formatDateOnly(application.date_of_birth),
    canWorkWeekends: displayValue(application.can_work_weekends),
    commuteUnder20Minutes: displayValue(application.commute_under_20_minutes),
    workAvailability: displayValue(application.work_availability),
    candidateMessage: displayValue(application.candidate_message),
    resumeAttachment: buildAttachmentDisplay(
      application.resume_url,
      application.resume_filename,
    ),
    coverLetterAttachment: buildAttachmentDisplay(
      application.cover_letter_url,
      application.cover_letter_filename,
    ),
    adminApplicationUrl: buildAdminApplicationUrl(
      adminApplicationsBaseUrl,
      application.id,
    ),
  };

  await sendEmail({
    senderEmail: DEFAULT_SENDER_EMAIL,
    senderName: DEFAULT_SENDER_NAME,
    recipientEmails,
    templateId: JOB_APPLICATION_NOTIFY_TEMPLATE,
    templateVarialbles: templateVariables,
  });

  console.log(
    `[job-application-notify] Sent ${JOB_APPLICATION_NOTIFY_TEMPLATE} for application #${applicationId} to ${recipientEmails.join(", ")}`,
  );
}
