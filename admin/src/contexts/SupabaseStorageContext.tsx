'use client';

import { STORAGE_BUCKET } from '@/constants';
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
};

export type SupabaseStorageContextValue = {
  uploadMedia: (file: File, options?: UploadMediaOptions) => Promise<UploadMediaResult>;
  getSignedUrl: (path: string, expiresInSeconds?: number) => Promise<string>;
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

  const uploadMedia = useCallback(
    async (file: File, options?: UploadMediaOptions) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('You must be signed in to upload files.');

      const folder = options?.folder ?? 'media';
      const ext = extensionFromFile(file);
      const fileName = options?.fileName ?? `${Date.now()}.${ext}`;
      const path = `${folder}/${user.id}/${fileName}`;

      setIsUploading(true);
      try {
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, {
            upsert: options?.upsert ?? true,
            contentType: file.type || undefined,
          });

        if (uploadError) throw uploadError;

        const signedUrl = await getSignedUrl(path);
        return { path, signedUrl };
      } finally {
        setIsUploading(false);
      }
    },
    [getSignedUrl],
  );

  const value = useMemo(
    () => ({
      uploadMedia,
      getSignedUrl,
      isUploading,
    }),
    [getSignedUrl, isUploading, uploadMedia],
  );

  return (
    <SupabaseStorageContext.Provider value={value}>
      {children}
    </SupabaseStorageContext.Provider>
  );
}
