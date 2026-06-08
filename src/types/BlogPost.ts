/** Row shape from `public.blog_posts` (list fields). */
export type BlogPostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  featured_image_url: string | null;
  published_at: string | null;
  view_count: number;
};

/** Full row from `public.blog_posts` including article body (server fetch). */
export type BlogPostDetailRow = BlogPostRow & {
  content: string;
  tags: string[];
  show_wholesale_cta: boolean;
  counting_secret: string;
};

/** Blog post summary for listing pages (camelCase). */
export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  featuredImageUrl: string | null;
  publishedAt: string | null;
  viewCount: number;
};

/** Blog post detail for article pages (camelCase, safe for client). */
export type BlogPostDetail = BlogPost & {
  content: string;
  tags: string[];
  showWholesaleCta: boolean;
  relatedPosts: BlogPost[];
};

/** SSR-only detail including counting secret (strip before client render). */
export type BlogPostDetailWithSecret = BlogPostDetail & {
  countingSecret: string;
};

export function mapBlogPostRow(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    featuredImageUrl: row.featured_image_url,
    publishedAt: row.published_at,
    viewCount: row.view_count,
  };
}

export function mapBlogPostDetailRow(
  row: BlogPostDetailRow,
): BlogPostDetailWithSecret {
  return {
    ...mapBlogPostRow(row),
    content: row.content,
    tags: row.tags,
    showWholesaleCta: row.show_wholesale_cta,
    countingSecret: row.counting_secret,
    relatedPosts: [],
  };
}

export function toPublicBlogPostDetail(
  post: BlogPostDetailWithSecret,
): BlogPostDetail {
  const { countingSecret: _countingSecret, ...publicPost } = post;
  return publicPost;
}
