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
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import {
  emptyBlogPostInput,
  type BlogPost,
  type BlogPostInput,
} from '@/types/BlogPost';
import { Loader2, Newspaper, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const BLOG_POST_COLUMNS =
  'id, slug, title, excerpt, content, category, featured_image_url, tags, published_at, view_count, is_published, show_wholesale_cta, created_at, updated_at';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
    tags: formatTags(post.tags),
    published_at: post.published_at,
    view_count: post.view_count,
    is_published: post.is_published,
    show_wholesale_cta: post.show_wholesale_cta,
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

export function BlogPosts() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BlogPostInput>(emptyBlogPostInput());
  const [slugTouched, setSlugTouched] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

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
      setPosts((data ?? []) as BlogPost[]);
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

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return posts;
    return posts.filter((post) => {
      return (
        post.title.toLowerCase().includes(term) ||
        post.slug.toLowerCase().includes(term) ||
        post.category.toLowerCase().includes(term) ||
        (post.excerpt ?? '').toLowerCase().includes(term)
      );
    });
  }, [posts, search]);

  const relatedPostOptions = useMemo(() => {
    return posts.filter((post) => post.id !== editingId);
  }, [posts, editingId]);

  const openCreate = () => {
    setEditingId(null);
    setSlugTouched(false);
    setForm(emptyBlogPostInput());
    setDialogOpen(true);
  };

  const openEdit = async (post: BlogPost) => {
    try {
      const relatedPostIds = await loadRelatedPostIds(post.id);
      setEditingId(post.id);
      setSlugTouched(true);
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
      const ids = new Set(current.related_post_ids);
      if (checked) {
        ids.add(postId);
      } else {
        ids.delete(postId);
      }
      return { ...current, related_post_ids: Array.from(ids) };
    });
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
      const payload = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content.trim(),
        category: form.category.trim() || 'News',
        featured_image_url: form.featured_image_url.trim() || null,
        tags: parseTags(form.tags),
        published_at: form.published_at,
        view_count: Math.max(0, Number(form.view_count) || 0),
        is_published: form.is_published,
        show_wholesale_cta: form.show_wholesale_cta,
      };

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
            <Button onClick={openCreate} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add post
            </Button>
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
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Slug
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Category
                      </th>
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
                        <td className="px-4 py-3 text-sm font-medium">
                          {post.title}
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

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside className="w-full max-w-sm shrink-0 overflow-y-auto border-r px-4 py-4">
              <div className="grid gap-4">
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
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="post-image">Featured image URL</Label>
                  <Input
                    id="post-image"
                    value={form.featured_image_url}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        featured_image_url: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="post-tags">Tags (comma-separated)</Label>
                  <Input
                    id="post-tags"
                    value={form.tags}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, tags: e.target.value }))
                    }
                    placeholder="Sorell, NewStore"
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
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm">
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
                    Published on site
                  </label>
                  <label className="flex items-center gap-2 text-sm">
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
                    Show wholesale CTA on article page
                  </label>
                </div>

                {relatedPostOptions.length > 0 && (
                  <div className="grid gap-2">
                    <Label>Related posts</Label>
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                      {relatedPostOptions.map((post) => (
                        <label
                          key={post.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Input
                            type="checkbox"
                            checked={form.related_post_ids.includes(post.id)}
                            onChange={(e) =>
                              toggleRelatedPost(post.id, e.target.checked)
                            }
                            className="mt-0.5 h-4 w-4"
                          />
                          <span>
                            <span className="font-medium">{post.title}</span>
                            <span className="block text-xs text-muted-foreground">
                              {post.slug}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
              <div className="grid shrink-0 gap-2">
                <Label htmlFor="post-excerpt">Excerpt</Label>
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
                <Label htmlFor="post-content">Content (HTML)</Label>
                <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                  <Textarea
                    id="post-content"
                    value={form.content}
                    wrap="off"
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        content: e.target.value,
                      }))
                    }
                    className="min-h-full w-full resize-none rounded-md border-0 font-mono text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
