import { getBlogPosts } from "@/lib/supabase/blog-posts";
import News from "@/views/News";

export default async function NewsPage() {
  const posts = await getBlogPosts();
  return <News posts={posts} />;
}
