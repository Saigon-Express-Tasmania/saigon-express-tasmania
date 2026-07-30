'use client';

import { optimizeImageFile } from '@/lib/image-optimize';
import {
  deleteR2Object,
  getR2PublicUrl,
  getR2SignedUrl,
  r2ObjectExists,
  uploadR2Object,
} from '@/lib/r2-client';
import { generateStorageFileName } from '@/lib/storage-file-name';
import { normalizeStoragePath } from '@/lib/storage-path';
import supabase from '@/lib/supabase/client';
import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const DEFAULT_SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

export type UploadMediaOptions = {
  /** Path segment after user id, e.g. `avatars` */
  folder?: string;
  fileName?: string;
  upsert?: boolean;
};

export type UploadMediaResult = {
  /** Object path inside the bucket */
  path: string;
  signedUrl: string;
  /** Permanent public URL when the bucket allows public read */
  publicUrl: string;
};

export type DeleteMediaResult = {
  path: string;
  deleted: boolean;
};

export type StorageContextValue = {
  uploadMedia: (file: File, options?: UploadMediaOptions) => Promise<UploadMediaResult>;
  deleteMedia: (path: string) => Promise<DeleteMediaResult>;
  getSignedUrl: (path: string, expiresInSeconds?: number) => Promise<string>;
  getPublicUrl: (path: string) => string;
  isUploading: boolean;
};

export const StorageContext = createContext<StorageContextValue | null>(null);

function extensionFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

/**
 * Media storage provider. Backend is currently Cloudflare R2; swap the
 * client helpers in `@/lib/r2-client` (or replace calls below) to change providers.
 */
export function StorageProvider({ children }: { children: ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);

  const getSignedUrl = useCallback(
    async (path: string, expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SEC) => {
      return getR2SignedUrl(normalizeStoragePath(path), expiresInSeconds);
    },
    [],
  );

  const getPublicUrl = useCallback((path: string) => {
    return getR2PublicUrl(normalizeStoragePath(path));
  }, []);

  const deleteMedia = useCallback(async (path: string): Promise<DeleteMediaResult> => {
    const objectPath = normalizeStoragePath(path);
    if (!objectPath) {
      throw new Error('Storage path is required.');
    }

    await deleteR2Object(objectPath);

    const stillExists = await r2ObjectExists(objectPath);
    if (stillExists) {
      throw new Error(
        'Storage did not delete the file. Check storage API token permissions.',
      );
    }

    return { path: objectPath, deleted: true };
  }, []);

  const uploadMedia = useCallback(
    async (file: File, options?: UploadMediaOptions) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('You must be signed in to upload files.');

      const folder = options?.folder ?? 'media';
      const uploadFile = await optimizeImageFile(file);
      const ext = extensionFromFile(uploadFile);
      const fileName = options?.fileName ?? generateStorageFileName(ext);
      const path = `${folder}/${user.id}/${fileName}`;

      setIsUploading(true);
      try {
        // Current backend (R2 PutObject) always overwrites existing keys.
        await uploadR2Object(path, uploadFile, uploadFile.type || undefined);

        const signedUrl = await getSignedUrl(path);
        const publicUrl = getPublicUrl(path);
        return { path, signedUrl, publicUrl };
      } finally {
        setIsUploading(false);
      }
    },
    [getPublicUrl, getSignedUrl],
  );

  const value = useMemo(
    () => ({
      uploadMedia,
      deleteMedia,
      getSignedUrl,
      getPublicUrl,
      isUploading,
    }),
    [deleteMedia, getPublicUrl, getSignedUrl, isUploading, uploadMedia],
  );

  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
}
