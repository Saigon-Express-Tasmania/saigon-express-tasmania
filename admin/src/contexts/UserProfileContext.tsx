'use client';

import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import supabase from '@/lib/supabase/client';
import type { UserProfile, UserProfileUpdate } from '@/types/UserProfile';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type UserProfileContextValue = {
  profile: UserProfile | null;
  avatarPreviewUrl: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: UserProfileUpdate) => Promise<UserProfile>;
  setAvatarPreviewUrl: (url: string | null) => void;
};

export const UserProfileContext = createContext<UserProfileContextValue | null>(null);

type ProfileRow = Omit<UserProfile, 'user_role' | 'is_verified'>;

async function resolveAvatarPreview(
  avatarPath: string | null | undefined,
  getSignedUrl: (path: string) => Promise<string>,
): Promise<string | null> {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  try {
    return await getSignedUrl(avatarPath);
  } catch {
    return null;
  }
}

function mergeAdminProfile(
  profile: ProfileRow,
  metadata: { user_role: UserProfile['user_role']; is_verified: boolean } | null,
): UserProfile {
  return {
    ...profile,
    user_role: metadata?.user_role ?? 'user',
    is_verified: metadata?.is_verified ?? false,
  };
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user, isSignedIn } = useSupabaseAuth();
  const { getSignedUrl } = useSupabaseStorage();
  const userId = user?.id;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasProfileRef = useRef(false);

  useEffect(() => {
    hasProfileRef.current = profile !== null;
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setAvatarPreviewUrl(null);
      setIsLoading(false);
      return;
    }

    if (!hasProfileRef.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [{ data: profileData, error: profileError }, { data: metadataData, error: metadataError }] =
        await Promise.all([
          supabase.from('user_profiles').select('*').eq('id', userId).single(),
          supabase
            .from('user_metadata')
            .select('user_role, is_verified')
            .eq('id', userId)
            .maybeSingle(),
        ]);

      if (profileError) throw profileError;
      if (metadataError) throw metadataError;

      const row = mergeAdminProfile(profileData as ProfileRow, metadataData);
      setProfile(row);
      setAvatarPreviewUrl(await resolveAvatarPreview(row.avatar_url, getSignedUrl));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load your profile.';
      setError(message);
      setProfile(null);
      setAvatarPreviewUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [getSignedUrl, userId]);

  useEffect(() => {
    if (isSignedIn && userId) {
      void refreshProfile();
      return;
    }

    setProfile(null);
    setAvatarPreviewUrl(null);
    setIsLoading(false);
  }, [isSignedIn, refreshProfile, userId]);

  const updateProfile = useCallback(
    async (updates: UserProfileUpdate) => {
      if (!user) throw new Error('Not authenticated');

      setIsSaving(true);
      setError(null);

      try {
        const { user_role: _role, is_verified: _verified, ...safeUpdates } =
          updates as UserProfileUpdate & {
            user_role?: unknown;
            is_verified?: unknown;
          };

        const { data, error: updateError } = await supabase
          .from('user_profiles')
          .update(safeUpdates)
          .eq('id', user.id)
          .select('*')
          .single();

        if (updateError) throw updateError;

        const row = mergeAdminProfile(data as ProfileRow, profile ? {
          user_role: profile.user_role,
          is_verified: profile.is_verified,
        } : null);
        setProfile(row);
        if (updates.avatar_url !== undefined) {
          setAvatarPreviewUrl(await resolveAvatarPreview(row.avatar_url, getSignedUrl));
        }
        return row;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save your profile.';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [getSignedUrl, profile, user],
  );

  const value = useMemo(
    () => ({
      profile,
      avatarPreviewUrl,
      isLoading,
      isSaving,
      error,
      refreshProfile,
      updateProfile,
      setAvatarPreviewUrl,
    }),
    [
      avatarPreviewUrl,
      error,
      isLoading,
      isSaving,
      profile,
      refreshProfile,
      updateProfile,
    ],
  );

  return (
    <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
  );
}
