import {
  getClientIpFromHeaders,
  hashClientIp,
  isValidBlogPostSlug,
  parseBlogPostViewResult,
} from "@/lib/blog-view-count";
import {
  createServerSupabaseClient,
  fetchBlogPostCountingSecret,
} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  if (!isValidBlogPostSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const countingSecret = await fetchBlogPostCountingSecret(slug);
  if (!countingSecret) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const ip = getClientIpFromHeaders(req.headers);
  const ipHash = hashClientIp(ip);

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("record_blog_post_view", {
    p_slug: slug,
    p_ip_hash: ipHash,
    p_counting_secret: countingSecret,
  });

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("record_blog_post_view failed:", error.message);
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }

  const result = parseBlogPostViewResult(data);
  if (!result) {
    return NextResponse.json({ error: "Invalid response" }, { status: 500 });
  }

  return NextResponse.json({
    counted: result.counted,
    viewCount: result.viewCount,
  });
}
