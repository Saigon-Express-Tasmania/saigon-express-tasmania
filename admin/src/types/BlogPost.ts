import { STORAGE_BUCKET } from '@/constants';
import { resolveStorageObjectPath } from '@/lib/storage-path';

export type BlogPostUploadedAsset = {
  path: string;
  publicUrl: string;
  fileName: string;
  uploadedAt: string;
};

export type BlogPostReference = {
  uploaded: BlogPostUploadedAsset[];
};

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  featured_image_url: string | null;
  news_logo_image_url: string | null;
  tags: string[];
  published_at: string | null;
  view_count: number;
  is_published: boolean;
  show_wholesale_cta: boolean;
  reference: BlogPostReference;
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
  news_logo_image_url: string;
  tags: string;
  published_at: string | null;
  view_count: number;
  is_published: boolean;
  show_wholesale_cta: boolean;
  reference: BlogPostReference;
  related_post_ids: number[];
};

export const emptyBlogPostReference = (): BlogPostReference => ({
  uploaded: [],
});

export const emptyBlogPostInput = (): BlogPostInput => ({
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  category: 'News',
  featured_image_url: '',
  news_logo_image_url: '',
  tags: '',
  published_at: new Date().toISOString(),
  view_count: 0,
  is_published: false,
  show_wholesale_cta: true,
  reference: emptyBlogPostReference(),
  related_post_ids: [],
});

export function normalizeBlogPostReference(value: unknown): BlogPostReference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return emptyBlogPostReference();
  }

  const rawUploaded = (value as { uploaded?: unknown }).uploaded;
  if (!Array.isArray(rawUploaded)) {
    return emptyBlogPostReference();
  }

  const uploaded: BlogPostUploadedAsset[] = [];
  for (const item of rawUploaded) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Partial<BlogPostUploadedAsset>;
    const publicUrl = String(record.publicUrl ?? '').trim();
    const path =
      resolveStorageObjectPath({
        path: String(record.path ?? '').trim(),
        publicUrl,
        bucket: STORAGE_BUCKET,
      }) ?? '';
    if (!path && !publicUrl) continue;

    uploaded.push({
      path,
      publicUrl,
      fileName: String(record.fileName ?? '').trim() || path.split('/').pop() || 'file',
      uploadedAt:
        typeof record.uploadedAt === 'string' && record.uploadedAt
          ? record.uploadedAt
          : new Date(0).toISOString(),
    });
  }

  return { uploaded };
}

export function appendUploadedAsset(
  reference: BlogPostReference,
  asset: Omit<BlogPostUploadedAsset, 'uploadedAt'> & { uploadedAt?: string },
): BlogPostReference {
  if (!asset.path.trim() && !asset.publicUrl.trim()) {
    return reference;
  }

  const publicUrl = asset.publicUrl.trim();
  const path =
    resolveStorageObjectPath({
      path: asset.path.trim(),
      publicUrl,
      bucket: STORAGE_BUCKET,
    }) ?? '';

  if (path && reference.uploaded.some((entry) => entry.path === path)) {
    return reference;
  }

  if (
    publicUrl &&
    reference.uploaded.some((entry) => entry.publicUrl === publicUrl)
  ) {
    return reference;
  }

  return {
    uploaded: [
      ...reference.uploaded,
      {
        path,
        publicUrl,
        fileName: asset.fileName.trim() || path.split('/').pop() || 'file',
        uploadedAt: asset.uploadedAt ?? new Date().toISOString(),
      },
    ],
  };
}
