'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';

export type ImageUploadProps = {
  value?: string | null;
  onFileSelect: (file: File) => void | Promise<void>;
  onClear?: () => void;
  disabled?: boolean;
  isUploading?: boolean;
  accept?: string;
  label?: string;
  description?: string;
  shape?: 'circle' | 'square';
  className?: string;
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
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const preview = localPreview ?? value ?? null;
  const busy = disabled || isUploading;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    try {
      await onFileSelect(file);
    } finally {
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
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
