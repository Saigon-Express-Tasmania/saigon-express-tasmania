function dimensionsWithinMax(
  width: number,
  height: number,
  maxSize: number,
): { width: number; height: number } {
  if (width <= maxSize && height <= maxSize) {
    return { width, height };
  }
  const scale = Math.min(maxSize / width, maxSize / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function outputNameForSize(originalName: string, size: number, ext: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image';
  return `${base}_${size}.${ext}`;
}

function outputMimeType(sourceType: string): { mime: string; ext: string } {
  if (sourceType === 'image/png') {
    return { mime: 'image/png', ext: 'png' };
  }
  if (sourceType === 'image/webp') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return { mime: 'image/jpeg', ext: 'jpg' };
}

/** Downscale so width and height are each <= maxSize (no upscaling). */
export async function resizeImageFile(file: File, maxSize: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = dimensionsWithinMax(
      bitmap.width,
      bitmap.height,
      maxSize,
    );
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context.');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const { mime, ext } = outputMimeType(file.type);
    const quality = mime === 'image/jpeg' ? 0.88 : undefined;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error('Failed to encode resized image.')),
        mime,
        quality,
      );
    });

    return new File([blob], outputNameForSize(file.name, maxSize, ext), {
      type: mime,
    });
  } finally {
    bitmap.close();
  }
}

export async function resizeImageToSizes(
  file: File,
  sizes: number[],
): Promise<File[]> {
  const uniqueSizes = [...new Set(sizes)].filter((s) => s > 0).sort((a, b) => a - b);
  return Promise.all(uniqueSizes.map((size) => resizeImageFile(file, size)));
}
