import { CACHE_TAGS, REVALIDATE_TAG_LIST } from "@/config";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

type RevalidateBody = {
  tags?: string[];
};

function isAuthorized(req: NextRequest, secret: string): boolean {
  const bearer = req.headers.get("authorization");
  const tokenHeader = req.headers.get("x-revalidate-token");
  const bearerToken = bearer?.startsWith("Bearer ")
    ? bearer.slice("Bearer ".length)
    : null;

  return bearerToken === secret || tokenHeader === secret;
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Missing REVALIDATE_SECRET on server." },
      { status: 500 },
    );
  }

  if (!isAuthorized(req, secret)) {
    return NextResponse.json(
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
    return NextResponse.json(
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

  return NextResponse.json({
    ok: true,
    revalidated: requested,
    availableTags: CACHE_TAGS,
    revalidatedAt: new Date().toISOString(),
  });
}
