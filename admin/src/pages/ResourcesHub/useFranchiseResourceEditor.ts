import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import supabase from '@/lib/supabase/client';
import {
  appendUploadedAsset,
  type BlogPostReference,
} from '@/types/BlogPost';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  buildResourcePayload,
  canPersistResource,
  CONTENT_AUTO_SAVE_MS,
  emptyResourceInput,
  resolveImagePreview,
  rowToInput,
  slugify,
  titleFromFileName,
  type FranchiseResourcePageConfig,
  type FranchiseResourceRow,
  type ResourceInput,
  type TaxonomyOption,
  type TaxonomyPlace,
} from './franchiseResourceShared';

type UseFranchiseResourceEditorOptions = {
  config: FranchiseResourcePageConfig;
  onSaved: () => Promise<void>;
};

export function useFranchiseResourceEditor({
  config,
  onSaved,
}: UseFranchiseResourceEditorOptions) {
  const { uploadMedia, isUploading, getPublicUrl } = useSupabaseStorage();
  const { resourceType, uploadFolder, labels } = config;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ResourceInput>(() =>
    emptyResourceInput(resourceType),
  );
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    null,
  );
  const [editorTab, setEditorTab] = useState<'main' | 'content' | 'files'>(
    'main',
  );
  const [saving, setSaving] = useState(false);

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

  const openCreate = useCallback((defaults?: Partial<ResourceInput>) => {
    clearContentAutoSaveTimer();
    lastSavedContentRef.current = null;
    editingIdRef.current = null;
    setEditingId(null);
    setForm({ ...emptyResourceInput(resourceType), ...defaults });
    setThumbnailPreviewUrl(null);
    setEditorTab('main');
    setDialogOpen(true);
  }, [clearContentAutoSaveTimer, resourceType]);

  const openEdit = useCallback(
    (row: FranchiseResourceRow) => {
      clearContentAutoSaveTimer();
      lastSavedContentRef.current = row.content ?? '';
      editingIdRef.current = row.id;
      setEditingId(row.id);
      setForm(rowToInput(row));
      setThumbnailPreviewUrl(
        resolveImagePreview(row.thumbnail_url, getPublicUrl),
      );
      setEditorTab('main');
      setDialogOpen(true);
    },
    [clearContentAutoSaveTimer, getPublicUrl],
  );

  const handleTitleChange = useCallback((title: string) => {
    setForm((current) => ({
      ...current,
      title,
      slug: slugify(title),
    }));
  }, []);

  const handleThumbnailUpload = useCallback(
    async (fileInputs: File | File[]) => {
      const file = Array.isArray(fileInputs) ? fileInputs[0] : fileInputs;
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const slugPart = slugify(form.title) || resourceType;
      const fileName = `${slugPart}-thumbnail-${Date.now()}.${ext}`;

      try {
        const { publicUrl } = await uploadMedia(file, {
          folder: uploadFolder,
          fileName,
          upsert: true,
        });
        setForm((prev) => ({ ...prev, thumbnail_url: publicUrl }));
        setThumbnailPreviewUrl(publicUrl);
        toast.success('Thumbnail uploaded.');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to upload thumbnail.',
        );
        throw err;
      }
    },
    [form.title, resourceType, uploadFolder, uploadMedia],
  );

  const handleThumbnailClear = useCallback(() => {
    setForm((prev) => ({ ...prev, thumbnail_url: '' }));
    setThumbnailPreviewUrl(null);
  }, []);

  const handleThumbnailUrlChange = useCallback(
    (url: string) => {
      setForm((prev) => ({ ...prev, thumbnail_url: url }));
      setThumbnailPreviewUrl(resolveImagePreview(url, getPublicUrl));
    },
    [getPublicUrl],
  );

  const handleContentFileUpload = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const derivedTitle = titleFromFileName(file.name);
      const slugPart =
        slugify(form.title) || slugify(derivedTitle) || resourceType;
      const fileName = `${slugPart}-content-${Date.now()}.${ext}`;

      try {
        const { publicUrl } = await uploadMedia(file, {
          folder: uploadFolder,
          fileName,
          upsert: true,
        });
        setForm((prev) => {
          if (prev.title.trim()) {
            return { ...prev, content_file: publicUrl };
          }
          return {
            ...prev,
            content_file: publicUrl,
            title: derivedTitle,
            slug: slugify(derivedTitle),
          };
        });
        toast.success('File uploaded.');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to upload file.',
        );
      }
    },
    [form.title, resourceType, uploadFolder, uploadMedia],
  );

  const handleVideoFileUpload = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const derivedTitle = titleFromFileName(file.name);
      const slugPart =
        slugify(form.title) || slugify(derivedTitle) || resourceType;
      const fileName = `${slugPart}-video-${Date.now()}.${ext}`;

      try {
        const { publicUrl } = await uploadMedia(file, {
          folder: uploadFolder,
          fileName,
          upsert: true,
        });
        setForm((prev) => {
          if (resourceType !== 'menu_training' || prev.title.trim()) {
            return { ...prev, video_file: publicUrl };
          }
          return {
            ...prev,
            video_file: publicUrl,
            title: derivedTitle,
            slug: slugify(derivedTitle),
          };
        });
        toast.success('Video uploaded.');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to upload video.',
        );
      }
    },
    [form.title, resourceType, uploadFolder, uploadMedia],
  );

  const handleAttachmentUpload = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const slugPart = slugify(form.title) || resourceType;
      const fileName = `${slugPart}-attachment-${Date.now()}.${ext}`;

      try {
        const { publicUrl } = await uploadMedia(file, {
          folder: uploadFolder,
          fileName,
          upsert: true,
        });
        setForm((prev) => ({
          ...prev,
          attached_files: [
            ...prev.attached_files,
            {
              name: file.name,
              url: publicUrl,
              mime_type: file.type || undefined,
              size_bytes: file.size,
            },
          ],
        }));
        toast.success('Attachment added.');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to upload attachment.',
        );
      }
    },
    [form.title, resourceType, uploadFolder, uploadMedia],
  );

  const removeAttachment = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      attached_files: prev.attached_files.filter((_, i) => i !== index),
    }));
  }, []);

  const autoSaveReference = useCallback(
    async (reference: BlogPostReference, content?: string) => {
      const currentForm = formRef.current;
      const nextForm: ResourceInput = {
        ...currentForm,
        reference,
        ...(content !== undefined ? { content } : {}),
      };

      formRef.current = nextForm;
      setForm(nextForm);

      const resourceId = editingIdRef.current;

      try {
        setSaving(true);

        if (resourceId !== null) {
          const patch: {
            reference: BlogPostReference;
            content?: string | null;
          } = { reference };
          if (content !== undefined) {
            patch.content = content.trim() || null;
            lastSavedContentRef.current = patch.content ?? '';
            clearContentAutoSaveTimer();
          }

          const { error: updateError } = await supabase
            .from('franchise_resources')
            .update(patch)
            .eq('id', resourceId);

          if (updateError) throw updateError;
        } else if (canPersistResource(nextForm)) {
          const { data, error: insertError } = await supabase
            .from('franchise_resources')
            .insert(buildResourcePayload(nextForm, resourceType))
            .select('id')
            .single();

          if (insertError) throw insertError;

          editingIdRef.current = data.id;
          setEditingId(data.id);
        } else {
          return;
        }

        await onSaved();
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
    [clearContentAutoSaveTimer, onSaved, resourceType],
  );

  const handleAssetUploaded = useCallback(
    async (
      asset: { path: string; publicUrl: string; fileName: string },
      contentHtml: string,
    ) => {
      const current = formRef.current;
      const reference = appendUploadedAsset(current.reference, {
        ...asset,
        uploadedAt: new Date().toISOString(),
      });
      await autoSaveReference(reference, contentHtml);
    },
    [autoSaveReference],
  );

  const handleReferenceChange = useCallback(
    async (reference: BlogPostReference) => {
      await autoSaveReference(reference);
    },
    [autoSaveReference],
  );

  const autoSaveContent = useCallback(async () => {
    const current = formRef.current;
    const content = current.content.trim();
    if (!canPersistResource(current)) return;
    if (lastSavedContentRef.current === content) return;

    const resourceId = editingIdRef.current;

    try {
      setSaving(true);

      if (resourceId !== null) {
        const { error: updateError } = await supabase
          .from('franchise_resources')
          .update({ content: content || null })
          .eq('id', resourceId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('franchise_resources')
          .insert(buildResourcePayload(current, resourceType))
          .select('id')
          .single();

        if (insertError) throw insertError;

        editingIdRef.current = data.id;
        setEditingId(data.id);
      }

      lastSavedContentRef.current = content;
      await onSaved();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to auto-save content.',
      );
    } finally {
      setSaving(false);
    }
  }, [onSaved, resourceType]);

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
    if (!dialogOpen) clearContentAutoSaveTimer();
  }, [clearContentAutoSaveTimer, dialogOpen]);

  useEffect(() => () => clearContentAutoSaveTimer(), [clearContentAutoSaveTimer]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    const slug = slugify(form.title);
    if (!slug) {
      toast.error('Slug could not be generated from the title.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      toast.error('Slug must be lowercase kebab-case.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildResourcePayload(form, resourceType);

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('franchise_resources')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success(labels.updatedToast);
      } else {
        const { error: insertError } = await supabase
          .from('franchise_resources')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success(labels.createdToast);
      }

      lastSavedContentRef.current = form.content.trim();
      clearContentAutoSaveTimer();
      setDialogOpen(false);
      await onSaved();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : labels.saveError,
      );
    } finally {
      setSaving(false);
    }
  }, [
    clearContentAutoSaveTimer,
    editingId,
    form,
    labels.createdToast,
    labels.saveError,
    labels.updatedToast,
    onSaved,
    resourceType,
  ]);

  return {
    dialogOpen,
    setDialogOpen,
    editingId,
    form,
    setForm,
    thumbnailPreviewUrl,
    editorTab,
    setEditorTab,
    saving,
    isUploading,
    openCreate,
    openEdit,
    handleTitleChange,
    handleThumbnailUpload,
    handleThumbnailClear,
    handleThumbnailUrlChange,
    handleContentFileUpload,
    handleVideoFileUpload,
    handleAttachmentUpload,
    removeAttachment,
    handleAssetUploaded,
    handleReferenceChange,
    handleContentChange,
    handleSave,
  };
}

export function useFranchiseResourceTaxonomies(
  taxonomyPlace: TaxonomyPlace,
  taxonomyKinds?: TaxonomyOption['kind'][],
) {
  const [taxonomies, setTaxonomies] = useState<TaxonomyOption[]>([]);

  const loadTaxonomies = useCallback(async () => {
    let query = supabase
      .from('franchise_resource_taxonomies')
      .select('id, kind, label, alias, sort_order, created_at')
      .eq('place', taxonomyPlace)
      .eq('is_active', true);

    if (taxonomyKinds && taxonomyKinds.length > 0) {
      query = query.in('kind', taxonomyKinds);
    }

    const { data, error: fetchError } = await query
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (fetchError) throw fetchError;
    setTaxonomies((data ?? []) as TaxonomyOption[]);
  }, [taxonomyKinds, taxonomyPlace]);

  return { taxonomies, loadTaxonomies };
}
