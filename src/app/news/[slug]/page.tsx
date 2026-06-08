import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPostBySlug } from "@/lib/supabase/blog-posts";
import NewsItem from "@/views/NewsItem";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return { title: "Article Not Found | Saigon Express Tasmania" };
  }

  return {
    title: `${post.title} | Saigon Express Tasmania`,
    description:
      post.excerpt ??
      `Read ${post.title} on Saigon Express Tasmania news and updates.`,
  };
}

export default async function NewsItemPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return <NewsItem post={post} />;
}
