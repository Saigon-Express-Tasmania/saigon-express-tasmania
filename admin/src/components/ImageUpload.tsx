'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { resizeImageToSizes } from '@/lib/image-resize';
import { useCallback, useId, useRef, useState } from 'react';

function fileMatchesAccept(file: File, accept: string): boolean {
  const type = file.type.toLowerCase();
  if (!type) return false;

  return accept
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .some((accepted) => {
      if (accepted.endsWith('/*')) {
        const prefix = accepted.slice(0, -1);
        return type.startsWith(prefix);
      }
      return type === accepted;
    });
}

export type ImageUploadProps = {
  value?: string | null;
  /** Single file when uploadResizes is empty; one file per size when uploadResizes is set. */
  onFileSelect: (files: File | File[]) => void | Promise<void>;
  onClear?: () => void;
  disabled?: boolean;
  isUploading?: boolean;
  accept?: string;
  label?: string;
  description?: string;
  shape?: 'circle' | 'square';
  className?: string;
  uploadResizes?: number[];
};

export function ImageUpload({
  value,
  onFileSelect,
  onClear,
  disabled = false,
  isUploading = false,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  label = 'Image',
  description,
  shape = 'circle',
  className,
  uploadResizes,
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const preview = localPreview ?? value ?? null;
  const busy = disabled || isUploading;
  const processFile = useCallback(
    async (file: File) => {
      if (busy) return;
      if (!fileMatchesAccept(file, accept)) return;

      const objectUrl = URL.createObjectURL(file);
      setLocalPreview(objectUrl);

      try {
        if (uploadResizes?.length) {
          const resized = await resizeImageToSizes(file, uploadResizes);
          await onFileSelect(resized);
        } else {
          await onFileSelect(file);
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
        setLocalPreview(null);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [accept, busy, onFileSelect, uploadResizes],
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    dragCounterRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (busy) return;

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg transition-colors',
        isDragging && 'bg-primary/5 ring-2 ring-primary ring-offset-2',
        className,
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'relative flex size-24 shrink-0 items-center justify-center overflow-hidden border bg-muted',
            shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          )}
        >
          {preview ? (
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" />
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <p className="text-sm font-medium">{label}</p>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
            {!busy ? (
              <p className="text-xs text-muted-foreground">
                Drag and drop an image here, or use Upload
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />
              {preview ? 'Replace' : 'Upload'}
            </Button>
            {preview && onClear ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onClear}
              >
                <X className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={busy}
        onChange={handleFileChange}
      />
    </div>
  );
}
