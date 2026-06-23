import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { sendJobApplicationNotifyEmail } from "../_shared/job-application-notify-email.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type SubmitJobApplicationInput = {
  p_job_title?: string | null;
  p_legal_first_name?: string | null;
  p_legal_last_name?: string | null;
  p_email?: string | null;
  p_agree_to_terms?: boolean | null;
  p_job_location?: string | null;
  p_store_id?: number | null;
  p_legal_middle_names?: string | null;
  p_phone?: string | null;
  p_resume_url?: string | null;
  p_resume_filename?: string | null;
  p_cover_letter_url?: string | null;
  p_cover_letter_filename?: string | null;
  p_date_of_birth?: string | null;
  p_can_work_weekends?: string | null;
  p_commute_under_20_minutes?: string | null;
  p_work_availability?: string | null;
  p_candidate_message?: string | null;
};

type SubmitJobApplicationResult = {
  id: number;
  submitted: boolean;
};

function parseSubmitJobApplicationInput(body: unknown): SubmitJobApplicationInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;
  const storeId = data.p_store_id;

  return {
    p_job_title: data.p_job_title != null ? String(data.p_job_title) : null,
    p_legal_first_name: data.p_legal_first_name != null
      ? String(data.p_legal_first_name)
      : null,
    p_legal_last_name: data.p_legal_last_name != null
      ? String(data.p_legal_last_name)
      : null,
    p_email: data.p_email != null ? String(data.p_email) : null,
    p_agree_to_terms: data.p_agree_to_terms === true
      || data.p_agree_to_terms === "true"
      || data.p_agree_to_terms === 1
      || data.p_agree_to_terms === "1",
    p_job_location: data.p_job_location != null ? String(data.p_job_location) : null,
    p_store_id: storeId == null || storeId === ""
      ? null
      : Number(storeId),
    p_legal_middle_names: data.p_legal_middle_names != null
      ? String(data.p_legal_middle_names)
      : null,
    p_phone: data.p_phone != null ? String(data.p_phone) : null,
    p_resume_url: data.p_resume_url != null ? String(data.p_resume_url) : null,
    p_resume_filename: data.p_resume_filename != null
      ? String(data.p_resume_filename)
      : null,
    p_cover_letter_url: data.p_cover_letter_url != null
      ? String(data.p_cover_letter_url)
      : null,
    p_cover_letter_filename: data.p_cover_letter_filename != null
      ? String(data.p_cover_letter_filename)
      : null,
    p_date_of_birth: data.p_date_of_birth != null
      ? String(data.p_date_of_birth)
      : null,
    p_can_work_weekends: data.p_can_work_weekends != null
      ? String(data.p_can_work_weekends)
      : null,
    p_commute_under_20_minutes: data.p_commute_under_20_minutes != null
      ? String(data.p_commute_under_20_minutes)
      : null,
    p_work_availability: data.p_work_availability != null
      ? String(data.p_work_availability)
      : null,
    p_candidate_message: data.p_candidate_message != null
      ? String(data.p_candidate_message)
      : null,
  };
}

async function submitJobApplication(
  input: SubmitJobApplicationInput,
): Promise<SubmitJobApplicationResult | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc(
    "submit_job_application",
    input,
  );

  if (error) {
    throw error;
  }

  const result = data as SubmitJobApplicationResult | null;
  const applicationId = result?.id;

  if (applicationId != null) {
    try {
      await sendJobApplicationNotifyEmail(applicationId);
    } catch (err) {
      console.error(
        `[job-application] Failed to send notify email for #${applicationId}:`,
        err,
      );
    }
  }

  return result;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const result = await submitJobApplication(parseSubmitJobApplicationInput(body));

    return jsonResponse(result ?? { submitted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit job application";
    const status = message.includes("invalid request") ? 400 : 500;
    console.error("[job-application] Error:", err);
    return jsonResponse({ error: message }, status);
  }
});
