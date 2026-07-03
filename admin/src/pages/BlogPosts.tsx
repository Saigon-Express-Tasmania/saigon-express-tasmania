import { BlogPostAssetReferencesDialog } from '@/components/BlogPostAssetReferencesDialog';
import { HtmlRichTextEditor } from '@/components/HtmlRichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';
import { DashboardLayout } from '@/components/layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshTableButton } from '@/components/ui/refresh-table-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { cleanBlogPostContent } from '@/lib/blog-content-cleaner';
import { generateExcerptFromBlogPost } from '@/lib/blog-excerpt';
import {
  BLOG_NEWS_LOGO_CUSTOM_VALUE,
  BLOG_NEWS_LOGO_NONE_VALUE,
  BLOG_NEWS_LOGO_PRESETS,
  getNewsLogoSelectValue,
  resolveSiteAssetUrl,
} from '@/lib/blog-news-logos';
import { generateTagsFromBlogPost } from '@/lib/blog-tag-keywords';
import { fetchSettingsByKeys } from '@/lib/settings';
import { generateStorageFileName } from '@/lib/storage-file-name';
import { cn } from '@/lib/utils';
import supabase from '@/lib/supabase/client';
import {
  appendUploadedAsset,
  emptyBlogPostInput,
  normalizeBlogPostReference,
  type BlogPost,
  type BlogPostInput,
  type BlogPostReference,
} from '@/types/BlogPost';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ImageIcon,
  Link2,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const DEFAULT_EDITOR_SIDEBAR_WIDTH = 384;
const MIN_EDITOR_SIDEBAR_WIDTH = 240;
const MAX_EDITOR_SIDEBAR_WIDTH = 640;
const CONTENT_AUTO_SAVE_MS = 3000;
const BLOG_IMAGE_UPLOAD_FOLDER = 'blog-posts';

const BLOG_POST_COLUMNS =
  'id, slug, title, excerpt, content, category, featured_image_url, news_logo_image_url, tags, published_at, view_count, is_published, show_wholesale_cta, reference, created_at, updated_at';

type SortColumn = 'id' | 'title' | 'category';
type SortDirection = 'asc' | 'desc';

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const isActive = sortColumn === column;
  const Icon = isActive
    ? sortDirection === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <th className="px-4 py-3 text-left text-sm font-semibold">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground/80"
        onClick={() => onSort(column)}
      >
        {label}
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </th>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomInitialViewCount(): number {
  return Math.floor(Math.random() * 231) + 20;
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean);
}

function formatTags(tags: string[]): string {
  return tags.join(', ');
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, '').toLowerCase();
}

function tagOverlapScore(postTags: string[], queryTags: string[]): number {
  const query = new Set(queryTags.map(normalizeTag));
  return postTags.filter((tag) => query.has(normalizeTag(tag))).length;
}

function findRelatedPostIdsByTags(
  posts: BlogPost[],
  editingId: number | null,
  queryTags: string[],
  limit = 5,
): number[] {
  const normalizedQuery = queryTags.map(normalizeTag).filter(Boolean);
  if (normalizedQuery.length === 0) {
    return [];
  }

  return posts
    .filter((post) => post.id !== editingId)
    .map((post) => ({
      id: post.id,
      score: tagOverlapScore(post.tags, normalizedQuery),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.id - a.id)
    .slice(0, limit)
    .map((candidate) => candidate.id);
}

function postMatchesRelatedSearch(post: BlogPost, term: string): boolean {
  if (!term) return true;
  const haystack = [
    post.title,
    post.slug,
    post.category,
    post.excerpt ?? '',
    formatTags(post.tags),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

function canPersistBlogPost(form: BlogPostInput): boolean {
  const slug = form.slug.trim();
  return (
    Boolean(form.title.trim()) &&
    Boolean(slug) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    Boolean(form.content.trim())
  );
}

function buildBlogPostPayload(form: BlogPostInput) {
  return {
    slug: form.slug.trim(),
    title: form.title.trim(),
    excerpt: form.excerpt.trim() || null,
    content: form.content.trim(),
    category: form.category.trim() || 'News',
    featured_image_url: form.featured_image_url.trim() || null,
    news_logo_image_url: form.news_logo_image_url.trim() || null,
    tags: parseTags(form.tags),
    published_at: form.published_at,
    view_count: Math.max(0, Number(form.view_count) || 0),
    is_published: form.is_published,
    show_wholesale_cta: form.show_wholesale_cta,
    reference: form.reference,
  };
}

function postToInput(
  post: BlogPost,
  relatedPostIds: number[],
): BlogPostInput {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? '',
    content: post.content,
    category: post.category,
    featured_image_url: post.featured_image_url ?? '',
    news_logo_image_url: post.news_logo_image_url ?? '',
    tags: formatTags(post.tags),
    published_at: post.published_at,
    view_count: post.view_count,
    is_published: post.is_published,
    show_wholesale_cta: post.show_wholesale_cta,
    reference: normalizeBlogPostReference(post.reference),
    related_post_ids: relatedPostIds,
  };
}

async function loadRelatedPostIds(postId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('blog_post_related')
    .select('related_post_id, sort_order')
    .eq('post_id', postId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => row.related_post_id);
}

async function saveRelatedPosts(
  postId: number,
  relatedPostIds: number[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('blog_post_related')
    .delete()
    .eq('post_id', postId);

  if (deleteError) throw deleteError;

  const uniqueIds = relatedPostIds.filter((id) => id !== postId);
  if (uniqueIds.length === 0) return;

  const { error: insertError } = await supabase.from('blog_post_related').insert(
    uniqueIds.map((relatedPostId, index) => ({
      post_id: postId,
      related_post_id: relatedPostId,
      sort_order: index + 1,
    })),
  );

  if (insertError) throw insertError;
}

function BlogPostFormSection({
  title,
  description,
  icon: Icon,
  children,
  accentClass,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  accentClass?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border p-3.5 shadow-sm',
        accentClass ?? 'border-border/70 bg-muted/20',
      )}
    >
      <div className="mb-3 flex items-start gap-2.5 border-b border-border/30 pb-2.5">
        {Icon ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background/90 shadow-xs ring-1 ring-border/40">
            <Icon className="size-3.5 text-foreground/75" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

export function BlogPosts() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia } = useSupabaseStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BlogPostInput>(emptyBlogPostInput());
  const [slugTouched, setSlugTouched] = useState(false);
  const [relatedSearch, setRelatedSearch] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [referencesDialogOpen, setReferencesDialogOpen] = useState(false);
  const [siteUrl, setSiteUrl] = useState('https://saigonexpress.com.au');
  const [isUploadingFeaturedImage, setIsUploadingFeaturedImage] = useState(false);

  const formRef = useRef(form);
  formRef.current = form;
  const editingIdRef = useRef(editingId);
  editingIdRef.current = editingId;
  const contentSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastSavedContentRef = useRef<string | null>(null);

  const clearContentAutoSaveTimer = useCallback(() => {
    if (contentSaveTimerRef.current) {
      clearTimeout(contentSaveTimerRef.current);
      contentSaveTimerRef.current = null;
    }
  }, []);

  const editorSplitRef = useRef<HTMLDivElement>(null);
  const sidebarDraggingRef = useRef(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_EDITOR_SIDEBAR_WIDTH);

  const handleSidebarMouseMove = useCallback((event: MouseEvent) => {
    if (!sidebarDraggingRef.current || !editorSplitRef.current) return;
    const rect = editorSplitRef.current.getBoundingClientRect();
    const width = event.clientX - rect.left;
    const maxWidth = Math.min(MAX_EDITOR_SIDEBAR_WIDTH, rect.width * 0.55);
    setSidebarWidth(
      Math.min(maxWidth, Math.max(MIN_EDITOR_SIDEBAR_WIDTH, width)),
    );
  }, []);

  const handleSidebarMouseUp = useCallback(() => {
    sidebarDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const startSidebarResize = (event: React.MouseEvent) => {
    event.preventDefault();
    sidebarDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleSidebarMouseMove);
    document.addEventListener('mouseup', handleSidebarMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleSidebarMouseMove);
      document.removeEventListener('mouseup', handleSidebarMouseUp);
    };
  }, [handleSidebarMouseMove, handleSidebarMouseUp]);

  useEffect(() => {
    if (!isAdmin) return;

    void fetchSettingsByKeys(['site_url']).then((settings) => {
      if (settings.site_url?.trim()) {
        setSiteUrl(settings.site_url.trim());
      }
    });
  }, [isAdmin]);

  const newsLogoSelectValue = getNewsLogoSelectValue(form.news_logo_image_url);
  const newsLogoPreviewUrl = resolveSiteAssetUrl(
    form.news_logo_image_url,
    siteUrl,
  );

  const handleNewsLogoSelectChange = (value: string) => {
    if (value === BLOG_NEWS_LOGO_CUSTOM_VALUE) {
      return;
    }

    setForm((current) => ({
      ...current,
      news_logo_image_url:
        value === BLOG_NEWS_LOGO_NONE_VALUE ? '' : value,
    }));
  };

  const loadPosts = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select(BLOG_POST_COLUMNS)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false });

      if (fetchError) throw fetchError;
      setPosts(
        (data ?? []).map((row) => ({
          ...(row as BlogPost),
          reference: normalizeBlogPostReference(
            (row as { reference?: unknown }).reference,
          ),
        })),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load blog posts.';
      setError(message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadPosts();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadPosts]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'id' ? 'desc' : 'asc');
  };

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = posts.filter((post) => {
      if (!term) return true;
      return (
        post.title.toLowerCase().includes(term) ||
        post.slug.toLowerCase().includes(term) ||
        post.category.toLowerCase().includes(term) ||
        (post.excerpt ?? '').toLowerCase().includes(term) ||
        String(post.id).includes(term)
      );
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortColumn === 'id') {
        return (a.id - b.id) * direction;
      }
      if (sortColumn === 'title') {
        return a.title.localeCompare(b.title) * direction;
      }
      return a.category.localeCompare(b.category) * direction;
    });
  }, [posts, search, sortColumn, sortDirection]);

  const selectedRelatedPosts = useMemo(() => {
    const order = new Map(
      form.related_post_ids.map((id, index) => [id, index]),
    );
    return posts
      .filter((post) => order.has(post.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [form.related_post_ids, posts]);

  const searchableRelatedPosts = useMemo(() => {
    const term = relatedSearch.trim().toLowerCase();
    return posts
      .filter((post) => post.id !== editingId)
      .filter((post) => postMatchesRelatedSearch(post, term))
      .sort((a, b) => b.id - a.id)
      .slice(0, 10);
  }, [posts, editingId, relatedSearch]);

  const openCreate = () => {
    clearContentAutoSaveTimer();
    lastSavedContentRef.current = null;
    editingIdRef.current = null;
    setEditingId(null);
    setSlugTouched(false);
    setRelatedSearch('');
    setForm({
      ...emptyBlogPostInput(),
      view_count: randomInitialViewCount(),
    });
    setDialogOpen(true);
  };

  const openEdit = async (post: BlogPost) => {
    try {
      const relatedPostIds = await loadRelatedPostIds(post.id);
      clearContentAutoSaveTimer();
      lastSavedContentRef.current = post.content;
      editingIdRef.current = post.id;
      setEditingId(post.id);
      setSlugTouched(true);
      setRelatedSearch('');
      setForm(postToInput(post, relatedPostIds));
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not load related posts.',
      );
    }
  };

  const handleTitleChange = (title: string) => {
    setForm((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugify(title),
    }));
  };

  const toggleRelatedPost = (postId: number, checked: boolean) => {
    setForm((current) => {
      if (checked) {
        if (current.related_post_ids.includes(postId)) {
          return current;
        }
        return {
          ...current,
          related_post_ids: [...current.related_post_ids, postId],
        };
      }
      return {
        ...current,
        related_post_ids: current.related_post_ids.filter((id) => id !== postId),
      };
    });
  };

  const autoSaveReference = useCallback(
    async (reference: BlogPostReference, content?: string) => {
      const currentForm = formRef.current;
      const nextForm: BlogPostInput = {
        ...currentForm,
        reference,
        ...(content !== undefined ? { content } : {}),
      };

      formRef.current = nextForm;
      setForm(nextForm);

      const postId = editingIdRef.current;

      try {
        setSaving(true);

        if (postId !== null) {
          const patch: {
            reference: BlogPostReference;
            content?: string;
          } = { reference };
          if (content !== undefined) {
            patch.content = content.trim();
            lastSavedContentRef.current = patch.content;
            clearContentAutoSaveTimer();
          }

          const { error } = await supabase
            .from('blog_posts')
            .update(patch)
            .eq('id', postId);

          if (error) throw error;
        } else if (canPersistBlogPost(nextForm)) {
          const { data, error } = await supabase
            .from('blog_posts')
            .insert(buildBlogPostPayload(nextForm))
            .select('id')
            .single();

          if (error) throw error;

          editingIdRef.current = data.id;
          setEditingId(data.id);
          setSlugTouched(true);
          await saveRelatedPosts(data.id, nextForm.related_post_ids);
        } else {
          return;
        }

        await loadPosts();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Failed to save asset references.',
        );
      } finally {
        setSaving(false);
      }
    },
    [loadPosts],
  );

  const handleAssetUploaded = useCallback(
    async (
      asset: { path: string; publicUrl: string; fileName: string },
      contentHtml: string,
    ) => {
      const current = formRef.current;
      const reference = appendUploadedAsset(current.reference, asset);
      await autoSaveReference(reference, contentHtml);
    },
    [autoSaveReference],
  );

  const handleFeaturedImageUpload = async (fileInput: File | File[]) => {
    const file = Array.isArray(fileInput) ? fileInput[0] : fileInput;
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    setIsUploadingFeaturedImage(true);
    try {
      const fileName = generateStorageFileName(ext);
      const { path, publicUrl } = await uploadMedia(file, {
        folder: BLOG_IMAGE_UPLOAD_FOLDER,
        fileName,
        upsert: true,
      });

      setForm((current) => ({
        ...current,
        featured_image_url: publicUrl,
        reference: appendUploadedAsset(current.reference, {
          path,
          publicUrl,
          fileName,
        }),
      }));
      toast.success('Featured image uploaded.');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to upload featured image.',
      );
      throw err;
    } finally {
      setIsUploadingFeaturedImage(false);
    }
  };

  const handleFeaturedImageClear = () => {
    setForm((current) => ({
      ...current,
      featured_image_url: '',
    }));
  };

  const handleReferenceChange = useCallback(
    async (reference: BlogPostReference) => {
      await autoSaveReference(reference);
    },
    [autoSaveReference],
  );

  const autoSaveContent = useCallback(async () => {
    const current = formRef.current;
    const content = current.content.trim();
    if (!content || !canPersistBlogPost(current)) return;
    if (lastSavedContentRef.current === content) return;

    const postId = editingIdRef.current;

    try {
      setSaving(true);

      if (postId !== null) {
        const { error } = await supabase
          .from('blog_posts')
          .update({ content })
          .eq('id', postId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('blog_posts')
          .insert(buildBlogPostPayload(current))
          .select('id')
          .single();

        if (error) throw error;

        editingIdRef.current = data.id;
        setEditingId(data.id);
        setSlugTouched(true);
        await saveRelatedPosts(data.id, current.related_post_ids);
      }

      lastSavedContentRef.current = content;
      await loadPosts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to auto-save content.',
      );
    } finally {
      setSaving(false);
    }
  }, [loadPosts]);

  const handleContentChange = useCallback(
    (content: string) => {
      setForm((current) => {
        const next = { ...current, content };
        formRef.current = next;
        return next;
      });

      clearContentAutoSaveTimer();
      contentSaveTimerRef.current = setTimeout(() => {
        void autoSaveContent();
      }, CONTENT_AUTO_SAVE_MS);
    },
    [autoSaveContent, clearContentAutoSaveTimer],
  );

  useEffect(() => {
    if (!dialogOpen) {
      clearContentAutoSaveTimer();
    }
  }, [clearContentAutoSaveTimer, dialogOpen]);

  useEffect(() => () => clearContentAutoSaveTimer(), [clearContentAutoSaveTimer]);

  const handleSuggestExcerpt = () => {
    if (!form.content.trim() && !form.title.trim()) {
      toast.error('Add a title or content first.');
      return;
    }

    const excerpt = generateExcerptFromBlogPost({
      title: form.title,
      content: form.content,
    });

    if (!excerpt) {
      toast.message('No text found to build an excerpt.');
      return;
    }

    setForm((current) => ({ ...current, excerpt }));
    toast.success('Excerpt generated from content.');
  };

  const handleCleanContent = () => {
    if (!form.content.trim()) {
      toast.error('Add content first.');
      return;
    }

    const cleaned = cleanBlogPostContent(form.content);
    if (cleaned === form.content.trim()) {
      toast.message('Content is already clean.');
      return;
    }

    handleContentChange(cleaned);
    toast.success('Content cleaned.');
  };

  const handleSuggestTags = () => {
    if (
      !form.title.trim() &&
      !form.excerpt.trim() &&
      !form.content.trim()
    ) {
      toast.error('Add a title or content first.');
      return;
    }

    const tags = generateTagsFromBlogPost({
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      category: form.category,
      maxTags: 10,
    });

    if (tags.length === 0) {
      toast.message('No keywords found in the content.');
      return;
    }

    setForm((current) => ({ ...current, tags: formatTags(tags) }));
    toast.success(`Generated ${tags.length} tag(s) from content.`);
  };

  const handleSuggestRelatedPosts = () => {
    const tags = parseTags(form.tags);
    if (tags.length === 0) {
      toast.error('Add tags first to suggest related posts.');
      return;
    }

    const suggested = findRelatedPostIdsByTags(posts, editingId, tags, 5);
    if (suggested.length === 0) {
      toast.message('No other posts share these tags.');
      return;
    }

    setForm((current) => ({ ...current, related_post_ids: suggested }));
    toast.success(`Selected ${suggested.length} related post(s) by tag.`);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!form.slug.trim()) {
      toast.error('Slug is required.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      toast.error('Slug must be lowercase kebab-case (e.g. my-blog-post).');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Content is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildBlogPostPayload(form);

      let postId = editingId;

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Blog post updated.');
      } else {
        const { data, error: insertError } = await supabase
          .from('blog_posts')
          .insert(payload)
          .select('id')
          .single();

        if (insertError) throw insertError;
        postId = data.id;
        toast.success('Blog post created.');
      }

      if (postId !== null) {
        await saveRelatedPosts(postId, form.related_post_ids);
      }

      lastSavedContentRef.current = form.content.trim();
      clearContentAutoSaveTimer();
      setDialogOpen(false);
      await loadPosts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save blog post.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Blog post deleted.');
      setDeleteTarget(null);
      await loadPosts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete blog post.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Blog Posts">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Blog Posts">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage blog posts.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Blog Posts">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Blog Posts
              </CardTitle>
              <CardDescription>
                Manage news articles shown on the public /news pages.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadPosts()}
                disabled={loading}
              />
              <Button onClick={openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add post
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Input
              placeholder="Search posts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No blog posts yet. Add one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <SortableHeader
                        label="ID"
                        column="id"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Title"
                        column="title"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Slug
                      </th>
                      <SortableHeader
                        label="Category"
                        column="category"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Published
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Views
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map((post) => (
                      <tr
                        key={post.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                          {post.id}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex min-w-0 items-center gap-2.5">
                            {post.news_logo_image_url ? (
                              <img
                                src={
                                  resolveSiteAssetUrl(
                                    post.news_logo_image_url,
                                    siteUrl,
                                  ) ?? ''
                                }
                                alt=""
                                className="h-6 w-auto max-w-[72px] shrink-0 object-contain"
                              />
                            ) : null}
                            <span className="min-w-0">{post.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {post.slug}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {post.category}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {post.published_at
                            ? new Date(post.published_at).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={post.is_published ? 'default' : 'secondary'}
                          >
                            {post.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {post.view_count}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void openEdit(post)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(post)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="fixed inset-0 top-0 left-0 z-50 flex h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-lg sm:max-w-none">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>
              {editingId !== null ? 'Edit blog post' : 'Add blog post'}
            </DialogTitle>
            <DialogDescription>
              Published posts appear on the public site when their publish date
              has passed.
            </DialogDescription>
          </DialogHeader>

          <div
            ref={editorSplitRef}
            className="relative z-30 flex min-h-0 flex-1 overflow-hidden"
          >
            <aside
              className="shrink-0 overflow-y-auto border-r border-border/50 bg-gradient-to-b from-violet-50/40 via-background to-sky-50/30 px-3 py-4 dark:from-violet-950/25 dark:via-background dark:to-sky-950/15"
              style={{ width: sidebarWidth }}
            >
              <div className="grid gap-3">
                <BlogPostFormSection
                  title="Post details"
                  description="Title, URL slug, and category badge."
                  icon={Type}
                  accentClass="border-violet-200/70 bg-gradient-to-br from-violet-50/90 to-background dark:border-violet-900/50 dark:from-violet-950/35"
                >
                  <div className="grid gap-2">
                    <Label htmlFor="post-title">Title</Label>
                    <Input
                      id="post-title"
                      value={form.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="post-slug">Slug</Label>
                    <Input
                      id="post-slug"
                      value={form.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setForm((current) => ({
                          ...current,
                          slug: e.target.value,
                        }));
                      }}
                      placeholder="my-blog-post"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="post-category">Category</Label>
                    <Input
                      id="post-category"
                      value={form.category}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          category: e.target.value,
                        }))
                      }
                      placeholder="News"
                    />
                  </div>
                </BlogPostFormSection>

                <BlogPostFormSection
                  title="Publication branding"
                  description="Optional outlet logo on news cards."
                  icon={Newspaper}
                  accentClass="border-rose-200/70 bg-gradient-to-br from-rose-50/90 to-background dark:border-rose-900/50 dark:from-rose-950/35"
                >
                  <div className="grid gap-2">
                    <Label htmlFor="post-news-logo">Publication logo URL</Label>
                    <Input
                      id="post-news-logo"
                      value={form.news_logo_image_url}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          news_logo_image_url: e.target.value,
                        }))
                      }
                      placeholder="/images/themercury.svg or https://…"
                    />
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="post-news-logo-preset"
                        className="text-xs text-muted-foreground"
                      >
                        Quick pick
                      </Label>
                      <Select
                        value={newsLogoSelectValue}
                        onValueChange={handleNewsLogoSelectChange}
                      >
                        <SelectTrigger
                          id="post-news-logo-preset"
                          className="w-full bg-background/80"
                        >
                          <SelectValue placeholder="Choose a preset logo" />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          {BLOG_NEWS_LOGO_PRESETS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paths like /images/themercury.svg resolve against site
                      URL ({siteUrl}).
                    </p>
                    {newsLogoPreviewUrl && (
                      <div className="rounded-lg border border-rose-200/50 bg-background/70 p-3 dark:border-rose-900/40">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Preview
                        </p>
                        <img
                          src={newsLogoPreviewUrl}
                          alt="Publication logo preview"
                          className="h-8 w-auto max-w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                </BlogPostFormSection>

                <BlogPostFormSection
                  title="Featured image"
                  description="Hero image on listing cards and the article page."
                  icon={ImageIcon}
                  accentClass="border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-background dark:border-amber-900/50 dark:from-amber-950/35"
                >
                  <ImageUpload
                    label="Upload image"
                    value={form.featured_image_url || null}
                    onFileSelect={handleFeaturedImageUpload}
                    onClear={
                      form.featured_image_url
                        ? handleFeaturedImageClear
                        : undefined
                    }
                    isUploading={isUploadingFeaturedImage}
                    disabled={saving}
                    shape="square"
                    className="rounded-lg border border-amber-200/40 bg-background/60 p-2 dark:border-amber-900/30"
                  />
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="post-featured-image-url"
                      className="text-xs text-muted-foreground"
                    >
                      Or paste image URL
                    </Label>
                    <Input
                      id="post-featured-image-url"
                      value={form.featured_image_url}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          featured_image_url: e.target.value,
                        }))
                      }
                      placeholder="/manus-storage/… or https://…"
                      disabled={saving || isUploadingFeaturedImage}
                      className="bg-background/80"
                    />
                  </div>
                </BlogPostFormSection>

                <BlogPostFormSection
                  title="Publish settings"
                  description="Schedule, visibility, and engagement."
                  icon={Calendar}
                  accentClass="border-sky-200/70 bg-gradient-to-br from-sky-50/90 to-background dark:border-sky-900/50 dark:from-sky-950/35"
                >
                  <div className="grid gap-2">
                    <Label htmlFor="post-published">Published at</Label>
                    <Input
                      id="post-published"
                      type="datetime-local"
                      value={toDatetimeLocalValue(form.published_at)}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          published_at: fromDatetimeLocalValue(e.target.value),
                        }))
                      }
                      className="bg-background/80"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="post-views">View count</Label>
                    <Input
                      id="post-views"
                      type="number"
                      min={0}
                      value={form.view_count}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          view_count: Number(e.target.value) || 0,
                        }))
                      }
                      className="bg-background/80"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-sky-200/60 bg-background/70 px-3 py-2.5 text-sm transition-colors hover:bg-background dark:border-sky-900/40">
                      <Input
                        type="checkbox"
                        checked={form.is_published}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            is_published: e.target.checked,
                          }))
                        }
                        className="h-4 w-4"
                      />
                      <span>
                        <span className="font-medium">Published on site</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Visible when publish date has passed
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-sky-200/60 bg-background/70 px-3 py-2.5 text-sm transition-colors hover:bg-background dark:border-sky-900/40">
                      <Input
                        type="checkbox"
                        checked={form.show_wholesale_cta}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            show_wholesale_cta: e.target.checked,
                          }))
                        }
                        className="h-4 w-4"
                      />
                      <span>
                        <span className="font-medium">Wholesale CTA</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Show registration block on article page
                        </span>
                      </span>
                    </label>
                  </div>
                </BlogPostFormSection>

                <BlogPostFormSection
                  title="Tags"
                  description="Topics for filtering and related-post suggestions."
                  icon={Tag}
                  accentClass="border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 to-background dark:border-emerald-900/50 dark:from-emerald-950/35"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="post-tags">Tags (comma-separated)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-emerald-200/70 bg-background/80 hover:bg-emerald-50/80 dark:border-emerald-900/50"
                      onClick={handleSuggestTags}
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Suggest
                    </Button>
                  </div>
                  <Input
                    id="post-tags"
                    value={form.tags}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, tags: e.target.value }))
                    }
                    placeholder="Sorell, NewStore"
                    className="bg-background/80"
                  />
                </BlogPostFormSection>

                {posts.length > (editingId !== null ? 1 : 0) && (
                  <BlogPostFormSection
                    title="Related posts"
                    description="Curated links shown at the bottom of the article."
                    icon={Link2}
                    accentClass="border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 to-background dark:border-indigo-900/50 dark:from-indigo-950/35"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Suggestions</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 border-indigo-200/70 bg-background/80 hover:bg-indigo-50/80 dark:border-indigo-900/50"
                        onClick={handleSuggestRelatedPosts}
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Suggest 5 by tags
                      </Button>
                    </div>

                    {selectedRelatedPosts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 rounded-lg border border-indigo-200/50 bg-background/70 p-2 dark:border-indigo-900/40">
                        {selectedRelatedPosts.map((post) => (
                          <Badge
                            key={post.id}
                            variant="secondary"
                            className="max-w-full gap-1 pr-1"
                          >
                            <span className="truncate">{post.title}</span>
                            <button
                              type="button"
                              className="rounded-sm hover:bg-muted"
                              onClick={() => toggleRelatedPost(post.id, false)}
                              aria-label={`Remove ${post.title}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Input
                      placeholder="Search posts to add…"
                      value={relatedSearch}
                      onChange={(e) => setRelatedSearch(e.target.value)}
                      className="bg-background/80"
                    />

                    <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-indigo-200/50 bg-background/70 p-2 dark:border-indigo-900/40">
                      {searchableRelatedPosts.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-muted-foreground">
                          No posts match your search.
                        </p>
                      ) : (
                        searchableRelatedPosts.map((post) => {
                          const selected = form.related_post_ids.includes(
                            post.id,
                          );
                          return (
                            <label
                              key={post.id}
                              className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30"
                            >
                              <Input
                                type="checkbox"
                                checked={selected}
                                onChange={(e) =>
                                  toggleRelatedPost(post.id, e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium leading-snug">
                                  {post.title}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  #{post.id} · {post.slug}
                                  {post.tags.length > 0 &&
                                    ` · ${formatTags(post.tags)}`}
                                </span>
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Showing up to 10 results, newest first. Selected posts
                      stay listed above.
                    </p>
                  </BlogPostFormSection>
                )}
              </div>
            </aside>

            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize metadata panel"
              title="Drag to resize"
              onMouseDown={startSidebarResize}
              className="relative z-10 w-2 shrink-0 cursor-col-resize border-r bg-border transition-colors hover:bg-primary/40 active:bg-primary/50"
            >
              <span className="absolute top-1/2 left-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/40" />
            </div>

            <div className="relative z-20 flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
              <div className="grid shrink-0 gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="post-excerpt">Excerpt</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={handleSuggestExcerpt}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Suggest excerpt
                  </Button>
                </div>
                <Textarea
                  id="post-excerpt"
                  rows={3}
                  className="resize-none"
                  value={form.excerpt}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      excerpt: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="post-content">Content</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={handleCleanContent}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Clean content
                  </Button>
                </div>
                <HtmlRichTextEditor
                  key={editingId ?? 'new'}
                  id="post-content"
                  value={form.content}
                  onChange={handleContentChange}
                  onAssetUploaded={handleAssetUploaded}
                  placeholder="Write the article body…"
                  className="min-h-0 flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="relative z-10 shrink-0 border-t px-6 py-4 sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReferencesDialogOpen(true)}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Asset references
              {form.reference.uploaded.length > 0 && (
                <span className="ml-1 text-muted-foreground">
                  ({form.reference.uploaded.length})
                </span>
              )}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BlogPostAssetReferencesDialog
        open={referencesDialogOpen}
        onOpenChange={setReferencesDialogOpen}
        reference={form.reference}
        onReferenceChange={(reference) => void handleReferenceChange(reference)}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.title}</strong> and
              its related-post links. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
