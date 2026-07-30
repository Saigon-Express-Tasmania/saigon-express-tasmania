import { DashboardLayout } from '@/components/layout';
import { ImageUpload } from '@/components/ImageUpload';
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
import { useStorage } from '@/hooks/useStorage';
import supabase from '@/lib/supabase/client';
import {
  emptyFeaturedReviewInput,
  type FeaturedReview,
  type FeaturedReviewInput,
} from '@/types/FeaturedReview';
import { Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

async function nextReviewId(): Promise<number> {
  const { data, error } = await supabase
    .from('featured_reviews')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxId = data?.[0]?.id ?? 0;
  return Number(maxId) + 1;
}

function reviewToInput(review: FeaturedReview): FeaturedReviewInput {
  return {
    id: review.id,
    reviewer_name: review.reviewer_name,
    reviewer_picture: review.reviewer_picture,
    rating: review.rating,
    review_text: review.review_text,
    location: review.location,
    is_featured: review.is_featured,
    created_at: review.created_at,
  };
}

function reviewerSlug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'reviewer'
  );
}

function ReviewerPictureCell({
  name,
  pictureUrl,
}: {
  name: string;
  pictureUrl: string | null;
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (pictureUrl) {
    return (
      <img
        src={pictureUrl}
        alt={name}
        className="size-9 rounded-full object-cover bg-muted"
      />
    );
  }

  return (
    <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {initials || '?'}
    </div>
  );
}

export function FeaturedReviewsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia, isUploading: isPictureUploading } = useStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FeaturedReviewInput>(emptyFeaturedReviewInput());

  const [deleteTarget, setDeleteTarget] = useState<FeaturedReview | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('featured_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setReviews((data ?? []) as FeaturedReview[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load reviews.';
      setError(message);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadReviews();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadReviews]);

  const openCreate = async () => {
    try {
      const id = await nextReviewId();
      setEditingId(null);
      setForm({
        ...emptyFeaturedReviewInput(),
        id,
        created_at: new Date().toISOString(),
      });
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not prepare new review.',
      );
    }
  };

  const openEdit = (review: FeaturedReview) => {
    setEditingId(review.id);
    setForm(reviewToInput(review));
    setDialogOpen(true);
  };

  const handlePictureUpload = async (fileInputs: File | File[]) => {
    const file = Array.isArray(fileInputs) ? fileInputs[0] : fileInputs;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${reviewerSlug(form.reviewer_name)}-${Date.now()}.${ext}`;

    try {
      const { publicUrl } = await uploadMedia(file, {
        folder: 'featured-reviews/avatars',
        fileName,
        upsert: true,
      });
      setForm((current) => ({ ...current, reviewer_picture: publicUrl }));
      toast.success('Reviewer photo uploaded.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload reviewer photo.';
      toast.error(message);
      throw err;
    }
  };

  const handlePictureClear = () => {
    setForm((current) => ({ ...current, reviewer_picture: null }));
  };

  const handleSave = async () => {
    if (!form.reviewer_name.trim()) {
      toast.error('Reviewer name is required.');
      return;
    }
    if (!form.review_text.trim()) {
      toast.error('Review text is required.');
      return;
    }
    if (form.rating < 1 || form.rating > 5) {
      toast.error('Rating must be between 1 and 5.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: form.id,
        reviewer_name: form.reviewer_name.trim(),
        reviewer_picture: form.reviewer_picture?.trim() || null,
        rating: form.rating,
        review_text: form.review_text.trim(),
        location: form.location?.trim() || null,
        is_featured: form.is_featured,
        created_at: form.created_at,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('featured_reviews')
          .update({
            reviewer_name: payload.reviewer_name,
            reviewer_picture: payload.reviewer_picture,
            rating: payload.rating,
            review_text: payload.review_text,
            location: payload.location,
            is_featured: payload.is_featured,
            created_at: payload.created_at,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Review updated.');
      } else {
        const { error: insertError } = await supabase
          .from('featured_reviews')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Review created.');
      }

      setDialogOpen(false);
      await loadReviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save review.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('featured_reviews')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Review deleted.');
      setDeleteTarget(null);
      await loadReviews();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete review.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Featured Reviews">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Featured Reviews">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage featured reviews.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Featured Reviews">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Featured Reviews
              </CardTitle>
              <CardDescription>
                Manage customer reviews shown on the public website carousel.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadReviews()}
                disabled={loading}
              />
              <Button onClick={() => void openCreate()} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add review
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reviews yet. Add one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Photo
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Reviewer
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Rating
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Featured
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Created
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr
                        key={review.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">
                          {review.id}
                        </td>
                        <td className="px-4 py-3">
                          <ReviewerPictureCell
                            name={review.reviewer_name}
                            pictureUrl={review.reviewer_picture}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {review.reviewer_name}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {review.rating} / 5
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {review.location ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              review.is_featured ? 'default' : 'secondary'
                            }
                          >
                            {review.is_featured ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(review)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(review)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit review' : 'Add review'}
            </DialogTitle>
            <DialogDescription>
              Reviews with Featured enabled appear on the public site.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="review-id">ID</Label>
              <Input
                id="review-id"
                type="number"
                value={form.id}
                disabled={editingId !== null}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reviewer-name">Reviewer name</Label>
              <Input
                id="reviewer-name"
                value={form.reviewer_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reviewer_name: e.target.value }))
                }
              />
            </div>
            <ImageUpload
              label="Reviewer photo"
              description="Shown on the public reviews carousel. JPEG, PNG, WebP or GIF."
              value={form.reviewer_picture}
              onFileSelect={handlePictureUpload}
              onClear={form.reviewer_picture ? handlePictureClear : undefined}
              isUploading={isPictureUploading}
              disabled={saving}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rating">Rating</Label>
                <Select
                  value={String(form.rating)}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, rating: Number(value) }))
                  }
                >
                  <SelectTrigger id="rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} stars
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="is-featured">Featured on site</Label>
                <Select
                  value={form.is_featured ? 'yes' : 'no'}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, is_featured: value === 'yes' }))
                  }
                >
                  <SelectTrigger id="is-featured">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Hobart, TAS"
                value={form.location ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    location: e.target.value || null,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="created-at">Created at</Label>
              <Input
                id="created-at"
                type="datetime-local"
                value={form.created_at.slice(0, 16)}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((f) => ({
                    ...f,
                    created_at: value
                      ? new Date(value).toISOString()
                      : f.created_at,
                  }));
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-text">Review text</Label>
              <Textarea
                id="review-text"
                rows={5}
                value={form.review_text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, review_text: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
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
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the review from{' '}
              <strong>{deleteTarget?.reviewer_name}</strong>. This cannot be
              undone.
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
