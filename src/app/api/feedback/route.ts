import {
  getClientIpFromHeaders,
  hashClientIp,
} from "@/lib/blog-view-count";
import {
  parseSubmitFeedbackResult,
  type SubmitFeedbackInput,
} from "@/lib/feedback-rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function isValidBody(body: unknown): body is SubmitFeedbackInput {
  if (!body || typeof body !== "object") return false;

  const record = body as Record<string, unknown>;
  return (
    typeof record.name === "string" &&
    typeof record.question === "string" &&
    (record.email === undefined || typeof record.email === "string") &&
    (record.source === undefined || record.source === "faq")
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = body.name.trim();
  const question = body.question.trim();
  const email = body.email?.trim() || null;
  const source = body.source ?? "faq";

  if (name.length < 1 || name.length > 128) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (question.length < 10 || question.length > 1000) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (email && email.length > 320) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ip = getClientIpFromHeaders(req.headers);
  const ipHash = hashClientIp(ip);

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("submit_feedback", {
    p_name: name,
    p_email: email,
    p_question: question,
    p_source: source,
    p_ip_hash: ipHash,
  });

  if (error) {
    if (error.message === "rate_limited") {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    if (error.code === "22023") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    console.error("submit_feedback failed:", error.message);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }

  const result = parseSubmitFeedbackResult(data);
  if (!result?.submitted) {
    return NextResponse.json({ error: "Invalid response" }, { status: 500 });
  }

  return NextResponse.json({ id: result.id, submitted: true });
}
