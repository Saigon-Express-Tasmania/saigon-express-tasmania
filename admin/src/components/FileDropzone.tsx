'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useCallback, useId, useRef, useState, type ReactNode } from 'react';

function fileMatchesAccept(file: File, accept?: string): boolean {
  if (!accept?.trim()) return true;

  const type = file.type.toLowerCase();
  const extension = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    : '';

  return accept
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .some((accepted) => {
      if (accepted.startsWith('.')) {
        return extension === accepted;
      }
      if (accepted.endsWith('/*')) {
        const prefix = accepted.slice(0, -1);
        return type.startsWith(prefix);
      }
      return type === accepted;
    });
}

export type FileDropzoneProps = {
  onFileSelect: (file: File) => void | Promise<void>;
  disabled?: boolean;
  isUploading?: boolean;
  accept?: string;
  multiple?: boolean;
  title: string;
  description?: string;
  hint?: string;
  icon?: ReactNode;
  className?: string;
};

export function FileDropzone({
  onFileSelect,
  disabled = false,
  isUploading = false,
  accept,
  multiple = false,
  title,
  description,
  hint = 'Drag and drop files here, or click to browse',
  icon,
  className,
}: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const busy = disabled || isUploading;

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (busy) return;

      const files = Array.from(fileList).filter((file) =>
        fileMatchesAccept(file, accept),
      );
      if (files.length === 0) return;

      for (const file of files) {
        await onFileSelect(file);
        if (!multiple) break;
      }
    },
    [accept, busy, multiple, onFileSelect],
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
    <div
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-disabled={busy}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
        isDragging && 'border-primary bg-primary/5 ring-2 ring-primary/20',
        busy && 'cursor-not-allowed opacity-60',
        className,
      )}
      onClick={() => {
        if (!busy) inputRef.current?.click();
      }}
      onKeyDown={(event) => {
        if (busy) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isUploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : (
        icon
      )}
      <span className="text-sm font-medium">{title}</span>
      {description ? (
        <span className="text-xs text-muted-foreground">{description}</span>
      ) : null}
      {!busy ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
      <Input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={busy}
        className="sr-only"
        onChange={handleFileChange}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
