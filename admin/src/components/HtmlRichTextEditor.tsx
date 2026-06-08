import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { registerImageUploadingBlot } from '@/lib/quill-image-uploading-blot';
import { generateStorageFileName } from '@/lib/storage-file-name';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import type { default as QuillType } from 'quill';
import 'react-quill-new/dist/quill.snow.css';
import { toast } from 'sonner';

registerImageUploadingBlot();

type InsertImageOptions = {
  showInlineSpinner?: boolean;
};

const pendingUploadPreviews = new Map<string, string>();

function createUploadId(): string {
  return `upload-${Date.now().toString(36)}`;
}

function findUploadPlaceholder(
  root: HTMLElement,
  uploadId: string,
): HTMLSpanElement | null {
  return root.querySelector(
    `span.ql-image-upload-placeholder[data-upload-id="${CSS.escape(uploadId)}"]`,
  );
}

function isEmbeddableBlot(blot: unknown): blot is { length(): number } {
  return Boolean(blot && typeof blot === 'object' && 'length' in blot);
}

function insertUploadPlaceholder(
  editor: QuillType,
  index: number,
  file: File,
): string {
  const uploadId = createUploadId();
  const previewUrl = URL.createObjectURL(file);
  pendingUploadPreviews.set(uploadId, previewUrl);

  editor.insertEmbed(index, 'imageUploading', uploadId, 'user');
  editor.setSelection(index + 1);

  requestAnimationFrame(() => {
    const node = findUploadPlaceholder(editor.root, uploadId);
    if (node) {
      node.style.backgroundImage = `url("${previewUrl}")`;
    }
  });

  return uploadId;
}

function clearUploadPreview(uploadId: string) {
  const previewUrl = pendingUploadPreviews.get(uploadId);
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    pendingUploadPreviews.delete(uploadId);
  }
}

function removeUploadPlaceholder(editor: QuillType, uploadId: string) {
  const node = findUploadPlaceholder(editor.root, uploadId);
  if (!node) {
    clearUploadPreview(uploadId);
    return;
  }

  const blot = Quill.find(node);
  if (isEmbeddableBlot(blot)) {
    const index = editor.getIndex(blot);
    editor.deleteText(index, 1, 'user');
  }

  clearUploadPreview(uploadId);
}

function replaceUploadPlaceholder(
  editor: QuillType,
  uploadId: string,
  publicUrl: string,
) {
  const node = findUploadPlaceholder(editor.root, uploadId);
  if (!node) {
    clearUploadPreview(uploadId);
    return;
  }

  const blot = Quill.find(node);
  if (!isEmbeddableBlot(blot)) {
    clearUploadPreview(uploadId);
    return;
  }

  const index = editor.getIndex(blot);
  editor.deleteText(index, 1, 'silent');
  editor.insertEmbed(index, 'image', publicUrl, 'user');
  editor.setSelection(index + 1);
  clearUploadPreview(uploadId);
}

function dropIndexFromEvent(editor: QuillType, event: DragEvent): number {
  const range =
    typeof document.caretRangeFromPoint === 'function'
      ? document.caretRangeFromPoint(event.clientX, event.clientY)
      : null;

  if (range) {
    const blot = Quill.find(range.startContainer, true);
    if (isEmbeddableBlot(blot)) {
      return editor.getIndex(blot) + (range.startOffset > 0 ? 1 : 0);
    }
  }

  return editor.getSelection(true)?.index ?? editor.getLength();
}

/** Matches https://quilljs.com/standalone/full/ toolbar */
const FULL_TOOLBAR = [
  [{ font: [] }, { size: [] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ header: 1 }, { header: 2 }, 'blockquote', 'code-block'],
  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  [{ direction: 'rtl' }, { align: [] }],
  ['link', 'image', 'video', 'formula'],
  ['clean'],
] as const;

const BLOG_IMAGE_UPLOAD_FOLDER = 'blog-posts';

function extensionFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

function imageFileFromDataTransfer(dataTransfer: DataTransfer | null): File | null {
  if (!dataTransfer?.files?.length) return null;
  return (
    Array.from(dataTransfer.files).find((file) => file.type.startsWith('image/')) ??
    null
  );
}

function imageFileFromClipboard(
  clipboardData: DataTransfer | null,
): File | null {
  if (!clipboardData?.items?.length) return null;
  for (const item of clipboardData.items) {
    if (item.type.startsWith('image/')) {
      return item.getAsFile();
    }
  }
  return null;
}

export type HtmlRichTextUploadedAsset = {
  path: string;
  publicUrl: string;
  fileName: string;
};

type HtmlRichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  onAssetUploaded?: (
    asset: HtmlRichTextUploadedAsset,
    contentHtml: string,
  ) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
};

export function HtmlRichTextEditor({
  id,
  value,
  onChange,
  onAssetUploaded,
  placeholder,
  readOnly = false,
  className,
}: HtmlRichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const { uploadMedia } = useSupabaseStorage();

  const insertUploadedImage = useCallback(
    async (
      file: File,
      index?: number,
      options: InsertImageOptions = {},
    ) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are supported.');
        return;
      }

      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const insertIndex =
        index ?? editor.getSelection(true)?.index ?? editor.getLength();

      const fileName = generateStorageFileName(extensionFromFile(file));
      const showInlineSpinner = options.showInlineSpinner ?? false;
      const uploadId = showInlineSpinner
        ? insertUploadPlaceholder(editor, insertIndex, file)
        : null;

      const toastId = showInlineSpinner
        ? undefined
        : toast.loading('Uploading image…');

      try {
        const { path, publicUrl } = await uploadMedia(file, {
          folder: BLOG_IMAGE_UPLOAD_FOLDER,
          fileName,
          upsert: true,
        });

        if (uploadId) {
          replaceUploadPlaceholder(editor, uploadId, publicUrl);
        } else {
          editor.insertEmbed(insertIndex, 'image', publicUrl, 'user');
          editor.setSelection(insertIndex + 1);
        }

        const contentHtml =
          typeof editor.getSemanticHTML === 'function'
            ? editor.getSemanticHTML()
            : editor.root.innerHTML;
        onAssetUploaded?.({ path, publicUrl, fileName }, contentHtml);

        if (toastId) {
          toast.success('Image uploaded.', { id: toastId });
        }
      } catch (err) {
        if (uploadId) {
          removeUploadPlaceholder(editor, uploadId);
        }

        toast.error(
          err instanceof Error ? err.message : 'Image upload failed.',
          toastId ? { id: toastId } : undefined,
        );
      }
    },
    [onAssetUploaded, uploadMedia],
  );

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [...FULL_TOOLBAR],
        handlers: {
          image: () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.onchange = () => {
              const file = input.files?.[0];
              if (file) void insertUploadedImage(file);
            };
            input.click();
          },
        },
      },
    }),
    [insertUploadedImage],
  );

  useEffect(() => {
    if (readOnly) return;

    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    const root = editor.root;

    const onDragOver = (event: DragEvent) => {
      if (imageFileFromDataTransfer(event.dataTransfer)) {
        event.preventDefault();
      }
    };

    const onDrop = (event: DragEvent) => {
      const file = imageFileFromDataTransfer(event.dataTransfer);
      if (!file) return;

      event.preventDefault();
      event.stopPropagation();

      const index = dropIndexFromEvent(editor, event);
      void insertUploadedImage(file, index, { showInlineSpinner: true });
    };

    const onPaste = (event: ClipboardEvent) => {
      const file = imageFileFromClipboard(event.clipboardData);
      if (!file) return;

      event.preventDefault();
      event.stopPropagation();

      const index = editor.getSelection(true)?.index ?? editor.getLength();
      void insertUploadedImage(file, index);
    };

    root.addEventListener('dragover', onDragOver);
    root.addEventListener('drop', onDrop, true);
    root.addEventListener('paste', onPaste, true);

    return () => {
      root.removeEventListener('dragover', onDragOver);
      root.removeEventListener('drop', onDrop, true);
      root.removeEventListener('paste', onPaste, true);
    };
  }, [insertUploadedImage, readOnly]);

  return (
    <div className={cn('html-rich-text-editor', className)}>
      <ReactQuill
        ref={quillRef}
        id={id}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}
