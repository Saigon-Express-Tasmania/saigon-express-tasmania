import { CACHE_TAGS, REVALIDATE_TAG_LIST } from "@/config";
import { getSiteContentSnapshot } from "@/lib/supabase/site-content";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

type RevalidateBody = {
  tags?: string[];
};

const ALLOWED_REVALIDATE_ORIGINS = new Set([
  "https://admin-sge-tasman.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  return ALLOWED_REVALIDATE_ORIGINS.has(origin) ? origin : null;
}

function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = resolveAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowedOrigin ?? "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-revalidate-token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonWithCors(
  req: NextRequest,
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  const origin = req.headers.get("origin");
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...buildCorsHeaders(origin),
      ...(init?.headers ?? {}),
    },
  });
}

function isAuthorized(req: NextRequest, secret: string): boolean {
  const bearer = req.headers.get("authorization");
  const tokenHeader = req.headers.get("x-revalidate-token");
  const bearerToken = bearer?.startsWith("Bearer ")
    ? bearer.slice("Bearer ".length)
    : null;

  return bearerToken === secret || tokenHeader === secret;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const siteContent = await getSiteContentSnapshot();
  const secret =
    siteContent.settings.revalidate_secret ||
    siteContent.settings.REVALIDATE_SECRET ||
    "";

  if (!secret) {
    return jsonWithCors(
      req,
      { ok: false, error: "Missing revalidate_secret in settings.json." },
      { status: 500 },
    );
  }

  if (!isAuthorized(req, secret)) {
    return jsonWithCors(
      req,
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: RevalidateBody = {};
  try {
    body = (await req.json()) as RevalidateBody;
  } catch {
    body = {};
  }

  const requested = body.tags?.length ? body.tags : REVALIDATE_TAG_LIST;
  const allowed = new Set<string>(REVALIDATE_TAG_LIST);
  const invalid = requested.filter((tag) => !allowed.has(tag));
  if (invalid.length > 0) {
    return jsonWithCors(
      req,
      {
        ok: false,
        error: "One or more tags are invalid.",
        invalid,
        allowed: REVALIDATE_TAG_LIST,
      },
      { status: 400 },
    );
  }

  for (const tag of requested) {
    revalidateTag(tag, "max");
  }

  return jsonWithCors(req, {
    ok: true,
    revalidated: requested,
    availableTags: CACHE_TAGS,
    revalidatedAt: new Date().toISOString(),
  });
}
