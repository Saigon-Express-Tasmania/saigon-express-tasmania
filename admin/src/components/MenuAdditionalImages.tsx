'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MenuImageMoreEntry } from '@/lib/menu-image-urls';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
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
        return type.startsWith(accepted.slice(0, -1));
      }
      return type === accepted;
    });
}

type MenuAdditionalImagesProps = {
  images: MenuImageMoreEntry[];
  onAdd: (file: File) => void | Promise<void>;
  onRemove: (index: number) => void;
  disabled?: boolean;
  isUploading?: boolean;
};

export function MenuAdditionalImages({
  images,
  onAdd,
  onRemove,
  disabled = false,
  isUploading = false,
}: MenuAdditionalImagesProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const busy = disabled || isUploading;
  const accept = 'image/jpeg,image/png,image/webp,image/gif';

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (busy) return;
      const files = Array.from(fileList).filter((file) =>
        fileMatchesAccept(file, accept),
      );
      for (const file of files) {
        await onAdd(file);
      }
    },
    [accept, busy, onAdd],
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const list = event.target.files;
    if (!list?.length) return;
    await processFiles(list);
    if (inputRef.current) inputRef.current.value = '';
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
    if (busy || !event.dataTransfer.files.length) return;
    await processFiles(event.dataTransfer.files);
  };

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-medium">Additional images</p>
        <p className="text-xs text-muted-foreground">
          Optional gallery images. Each upload creates a 256px (sm) and 1920px
          (lg) variant.
        </p>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={`${image.lg}-${index}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={image.lg || image.sm}
                alt=""
                className="size-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 size-8 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                disabled={busy}
                onClick={() => onRemove(index)}
                aria-label={`Remove additional image ${index + 1}`}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          'flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center transition-colors',
          isDragging && 'border-primary bg-primary/5 ring-2 ring-primary/30',
          busy && 'pointer-events-none opacity-60',
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <Loader2 className="size-8 animate-spin text-primary" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {isUploading ? 'Uploading…' : 'Drag images here'}
          </p>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP or GIF — or use the button below
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          Upload image
        </Button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple
          className="sr-only"
          disabled={busy}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
