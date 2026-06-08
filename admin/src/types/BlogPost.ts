export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  featured_image_url: string | null;
  tags: string[];
  published_at: string | null;
  view_count: number;
  is_published: boolean;
  show_wholesale_cta: boolean;
  created_at: string;
  updated_at: string;
};

export type BlogPostInput = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  featured_image_url: string;
  tags: string;
  published_at: string | null;
  view_count: number;
  is_published: boolean;
  show_wholesale_cta: boolean;
  related_post_ids: number[];
};

export const emptyBlogPostInput = (): BlogPostInput => ({
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  category: 'News',
  featured_image_url: '',
  tags: '',
  published_at: new Date().toISOString(),
  view_count: 0,
  is_published: false,
  show_wholesale_cta: true,
  related_post_ids: [],
});
