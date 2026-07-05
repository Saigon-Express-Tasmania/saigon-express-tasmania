'use client';

import { STORAGE_BUCKET } from '@/constants';
import { optimizeImageFile } from '@/lib/image-optimize';
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

export type SupabaseStorageContextValue = {
  uploadMedia: (file: File, options?: UploadMediaOptions) => Promise<UploadMediaResult>;
  deleteMedia: (path: string) => Promise<DeleteMediaResult>;
  getSignedUrl: (path: string, expiresInSeconds?: number) => Promise<string>;
  getPublicUrl: (path: string) => string;
  isUploading: boolean;
};

export const SupabaseStorageContext = createContext<SupabaseStorageContextValue | null>(
  null,
);

function extensionFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

export function SupabaseStorageProvider({ children }: { children: ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);

  const getSignedUrl = useCallback(
    async (path: string, expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SEC) => {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path, expiresInSeconds);

      if (error) throw error;
      return data.signedUrl;
    },
    [],
  );

  const getPublicUrl = useCallback((path: string) => {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const deleteMedia = useCallback(async (path: string): Promise<DeleteMediaResult> => {
    if (!STORAGE_BUCKET) {
      throw new Error('Storage bucket is not configured.');
    }

    const objectPath = normalizeStoragePath(path);
    if (!objectPath) {
      throw new Error('Storage path is required.');
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([objectPath]);

    if (error) throw error;

    const fileName = objectPath.split('/').pop() ?? objectPath;
    const deleted = (data ?? []).some((item) => {
      const deletedPath = normalizeStoragePath(item.name);
      return deletedPath === objectPath || deletedPath === fileName;
    });

    if (!deleted) {
      const parentFolder = objectPath.includes('/')
        ? objectPath.slice(0, objectPath.lastIndexOf('/'))
        : '';

      const { data: listed, error: listError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(parentFolder, { search: fileName });

      if (listError) throw listError;

      const stillExists = (listed ?? []).some((item) => {
        const fullPath = parentFolder
          ? `${parentFolder}/${item.name}`
          : item.name;
        return normalizeStoragePath(fullPath) === objectPath;
      });

      if (stillExists) {
        throw new Error(
          'Storage did not delete the file. Check admin storage delete permissions.',
        );
      }
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
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, uploadFile, {
            upsert: options?.upsert ?? true,
            contentType: uploadFile.type || undefined,
          });

        if (uploadError) throw uploadError;

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
    <SupabaseStorageContext.Provider value={value}>
      {children}
    </SupabaseStorageContext.Provider>
  );
}
