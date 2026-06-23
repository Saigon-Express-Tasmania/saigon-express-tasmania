"use client";

import { ENV } from "@/config/env";
import { supabase } from "@/lib/supabase/client";
import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const DEFAULT_SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

export type UploadMediaOptions = {
  /** Path segment before user id, e.g. `avatars` */
  folder?: string;
  fileName?: string;
  upsert?: boolean;
  /** Upload to `job-applications/guest/{guestId}/` without requiring sign-in */
  guestId?: string;
};

export type UploadMediaResult = {
  /** Object path inside the bucket */
  path: string;
  signedUrl: string;
  /** Public URL when the bucket allows anonymous read */
  publicUrl: string;
};

export type SupabaseStorageContextValue = {
  uploadMedia: (file: File, options?: UploadMediaOptions) => Promise<UploadMediaResult>;
  getSignedUrl: (path: string, expiresInSeconds?: number) => Promise<string>;
  getPublicUrl: (path: string) => string;
  isUploading: boolean;
};

export const SupabaseStorageContext =
  createContext<SupabaseStorageContextValue | null>(null);

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export function SupabaseStorageProvider({ children }: { children: ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const bucket = ENV.supabaseStorageBucketForCustomer;

  const getSignedUrl = useCallback(
    async (path: string, expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SEC) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds);

      if (error) throw error;
      return data.signedUrl;
    },
    [bucket],
  );

  const getPublicUrl = useCallback(
    (path: string) => {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },
    [bucket],
  );

  const uploadMedia = useCallback(
    async (file: File, options?: UploadMediaOptions) => {
      const guestId = options?.guestId?.trim();
      const ext = extensionFromFile(file);
      const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = options?.fileName ??
        (safeOriginalName ? `${Date.now()}-${safeOriginalName}` : `${Date.now()}.${ext}`);

      let path: string;

      if (guestId) {
        path = `job-applications/guest/${guestId}/${fileName}`;
      } else {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("You must be signed in to upload files.");

        const folder = options?.folder ?? "media";
        path = `${folder}/${user.id}/${fileName}`;
      }

      setIsUploading(true);
      try {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            upsert: options?.upsert ?? true,
            contentType: file.type || undefined,
          });

        if (uploadError) throw uploadError;

        const signedUrl = await getSignedUrl(path);
        const publicUrl = getPublicUrl(path);
        return { path, signedUrl, publicUrl };
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, getPublicUrl, getSignedUrl],
  );

  const value = useMemo(
    () => ({
      uploadMedia,
      getSignedUrl,
      getPublicUrl,
      isUploading,
    }),
    [getPublicUrl, getSignedUrl, isUploading, uploadMedia],
  );

  return (
    <SupabaseStorageContext.Provider value={value}>
      {children}
    </SupabaseStorageContext.Provider>
  );
}
