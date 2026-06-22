import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { sendContactNotifyEmail } from "../_shared/contact-notify-email.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type SubmitFranchiseInterestInput = {
  p_interest_type?: string | null;
  p_full_name?: string | null;
  p_email?: string | null;
  p_phone?: string | null;
  p_city?: string | null;
  p_state?: string | null;
  p_investment_budget?: string | null;
  p_business_experience?: string | null;
  p_preferred_date?: string | null;
  p_preferred_time?: string | null;
  p_message?: string | null;
  p_business_name?: string | null;
  p_event_date?: string | null;
  p_guest_count?: number | null;
};

type SubmitFranchiseInterestResult = {
  id: number;
  submitted: boolean;
};

function parseSubmitInput(body: unknown): SubmitFranchiseInterestInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;
  const guestCount = data.p_guest_count;

  return {
    p_interest_type: data.p_interest_type != null
      ? String(data.p_interest_type)
      : null,
    p_full_name: data.p_full_name != null ? String(data.p_full_name) : null,
    p_email: data.p_email != null ? String(data.p_email) : null,
    p_phone: data.p_phone != null ? String(data.p_phone) : null,
    p_city: data.p_city != null ? String(data.p_city) : null,
    p_state: data.p_state != null ? String(data.p_state) : null,
    p_investment_budget: data.p_investment_budget != null
      ? String(data.p_investment_budget)
      : null,
    p_business_experience: data.p_business_experience != null
      ? String(data.p_business_experience)
      : null,
    p_preferred_date: data.p_preferred_date != null
      ? String(data.p_preferred_date)
      : null,
    p_preferred_time: data.p_preferred_time != null
      ? String(data.p_preferred_time)
      : null,
    p_message: data.p_message != null ? String(data.p_message) : null,
    p_business_name: data.p_business_name != null
      ? String(data.p_business_name)
      : null,
    p_event_date: data.p_event_date != null ? String(data.p_event_date) : null,
    p_guest_count: guestCount == null || guestCount === ""
      ? null
      : Number(guestCount),
  };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const input = parseSubmitInput(await req.json());
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc(
      "submit_franchise_interest",
      input,
    );

    if (error) {
      throw error;
    }

    const result = data as SubmitFranchiseInterestResult | null;
    const interestId = result?.id;

    if (interestId != null) {
      try {
        await sendContactNotifyEmail(interestId);
      } catch (err) {
        console.error(
          `[franchise-interest] Failed to send contact notify for #${interestId}:`,
          err,
        );
      }
    }

    return jsonResponse(result ?? { submitted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit interest";
    const status = message.includes("invalid request") ? 400 : 500;
    console.error("[franchise-interest] Error:", err);
    return jsonResponse({ error: message }, status);
  }
});
