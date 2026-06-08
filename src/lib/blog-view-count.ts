import { createHash } from "node:crypto";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidBlogPostSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function hashClientIp(
  ip: string,
  salt = process.env.BLOG_VIEW_IP_SALT ?? "",
): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function getClientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export type BlogPostViewResult = {
  counted: boolean;
  viewCount: number;
};

export function parseBlogPostViewResult(data: unknown): BlogPostViewResult | null {
  if (!data || typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  const counted = record.counted;
  const viewCount = record.view_count ?? record.viewCount;

  if (typeof counted !== "boolean" || typeof viewCount !== "number") {
    return null;
  }

  return { counted, viewCount };
}
