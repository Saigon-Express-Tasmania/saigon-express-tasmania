const OPTIMIZABLE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

/** Aligns with scripts/lib/image-optimize.mjs mozjpeg settings. */
const JPEG_ENCODE_OPTIONS = {
  quality: 82,
  progressive: true,
  optimize_coding: true,
} as const;

/** Level 4 is the highest Oxipng recommends for practical use. */
const PNG_OPTIMISE_OPTIONS = {
  level: 4,
  interlace: false,
  optimiseAlpha: true,
} as const;

function normalizeMimeType(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower === 'image/jpg') return 'image/jpeg';
  return lower;
}

export function isOptimizableImage(file: File): boolean {
  return OPTIMIZABLE_MIME_TYPES.has(normalizeMimeType(file.type));
}

function toOptimizedFile(
  buffer: ArrayBuffer,
  original: File,
  type: string,
): File {
  return new File([buffer], original.name, { type });
}

async function optimizeJpeg(file: File): Promise<File> {
  const input = await file.arrayBuffer();
  const { decode, encode } = await import('@jsquash/jpeg');

  const imageData = await decode(input, { preserveOrientation: true });
  const output = await encode(imageData, JPEG_ENCODE_OPTIONS);

  if (output.byteLength >= file.size) {
    return file;
  }

  // log the percentage of the original file size that was saved and the kb saved
  const percentageSaved = ((file.size - output.byteLength) / file.size) * 100;
  const kbSaved = (file.size - output.byteLength) / 1024;
  console.log('optimized jpeg file', kbSaved.toFixed(2), 'kb saved', `(${percentageSaved.toFixed(2)}%)`);
  return toOptimizedFile(output, file, 'image/jpeg');
}

async function optimizePng(file: File): Promise<File> {
  const input = await file.arrayBuffer();
  const { optimise } = await import('@jsquash/oxipng');

  const output = await optimise(input, PNG_OPTIMISE_OPTIONS);

  if (output.byteLength >= file.size) {
    return file;
  }

  // log the percentage of the original file size that was saved and the kb saved
  const percentageSaved = ((file.size - output.byteLength) / file.size) * 100;
  const kbSaved = (file.size - output.byteLength) / 1024;
  console.log('optimized png file', kbSaved.toFixed(2), 'kb saved', `(${percentageSaved.toFixed(2)}%)`);
  return toOptimizedFile(output, file, 'image/png');
}

/** Losslessly recompress PNG/JPEG at original dimensions using WASM codecs. */
export async function optimizeImageFile(file: File): Promise<File> {
  if (!isOptimizableImage(file)) {    
    return file;
  }

  try {
    const mime = normalizeMimeType(file.type);
    if (mime === 'image/jpeg') {
      return optimizeJpeg(file);
    }
    return optimizePng(file);
  } catch {
    return file;
  }
}
