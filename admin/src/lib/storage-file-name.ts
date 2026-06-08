import { customAlphabet } from 'nanoid';

const createStorageId = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_',
  16,
);

export function generateStorageFileName(extension: string): string {
  const ext = extension.replace(/^\./, '').toLowerCase() || 'bin';
  return `${createStorageId()}.${ext}`;
}
