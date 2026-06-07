"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import {
  signInWithEmail,
  signOut as authSignOut,
  signUpWithEmail,
} from "@/lib/supabase/auth-helpers";
import {
  fetchUserProfile,
  updateUserProfile,
} from "@/lib/supabase/user-profiles";
import {
  DEFAULT_USER_AUTH_METADATA,
  fetchUserAuthMetadata,
} from "@/lib/supabase/user-metadata";
import type {
  UserAuthMetadata,
  UserProfile,
  UserProfileSelfUpdate,
} from "@/types/UserProfile";

export type SignInResult = {
  profile: UserProfile;
  authMetadata: UserAuthMetadata;
};

export type SupabaseContextValue = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  authMetadata: UserAuthMetadata;
  isLoading: boolean;
  isSignedIn: boolean;
  signInWithPassword: (email: string, password: string) => Promise<SignInResult>;
  signUpWithPassword: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ) => Promise<{ session: Session | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateOwnProfile: (updates: UserProfileSelfUpdate) => Promise<UserProfile>;
};

export const SupabaseContext = createContext<SupabaseContextValue | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authMetadata, setAuthMetadata] = useState<UserAuthMetadata>(
    DEFAULT_USER_AUTH_METADATA,
  );
  const [isLoading, setIsLoading] = useState(true);

  const clearSignedInUser = useCallback(() => {
    setProfile(null);
    setAuthMetadata(DEFAULT_USER_AUTH_METADATA);
  }, []);

  const loadSignedInUser = useCallback(async (activeSession: Session) => {
    const userId = activeSession.user.id;
    const [row, metadata] = await Promise.all([
      fetchUserProfile(userId),
      fetchUserAuthMetadata(userId, activeSession.user.app_metadata),
    ]);

    setProfile(row);
    setAuthMetadata(metadata);

    return { profile: row, authMetadata: metadata };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id || !session) {
      clearSignedInUser();
      return;
    }

    await loadSignedInUser(session);
  }, [clearSignedInUser, loadSignedInUser, session, user?.id]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await loadSignedInUser(initialSession);
        } else {
          clearSignedInUser();
        }
      } catch (error) {
        console.error("Error initializing Supabase session:", error);
      } finally {
        console.log("isLoading", isLoading);
        if (mounted) setIsLoading(false);
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "TOKEN_REFRESHED") {
        setSession(newSession);
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        try {
          await loadSignedInUser(newSession);
        } catch (error) {
          console.error("Error loading profile after auth change:", error);
          clearSignedInUser();
        }
      } else {
        clearSignedInUser();
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearSignedInUser, loadSignedInUser]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const nextSession = await signInWithEmail(email, password);
    setSession(nextSession);
    setUser(nextSession.user);

    const { profile: row, authMetadata: metadata } =
      await loadSignedInUser(nextSession);

    if (!row) {
      throw new Error("Unable to load your profile. Please try again.");
    }

    return { profile: row, authMetadata: metadata };
  }, [loadSignedInUser]);

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      metadata?: Record<string, unknown>,
    ) => {
      const result = await signUpWithEmail(email, password, metadata);

      if (result.session) {
        setSession(result.session);
        setUser(result.session.user);
        await loadSignedInUser(result.session);
      }

      return result;
    },
    [loadSignedInUser],
  );

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
    setUser(null);
    clearSignedInUser();
  }, [clearSignedInUser]);

  const updateOwnProfile = useCallback(
    async (updates: UserProfileSelfUpdate) => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      const row = await updateUserProfile(user.id, updates);
      setProfile(row);
      return row;
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      authMetadata,
      isLoading,
      isSignedIn: Boolean(session?.user),
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshProfile,
      updateOwnProfile,
    }),
    [
      authMetadata,
      user,
      session,
      profile,
      isLoading,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshProfile,
      updateOwnProfile,
    ],
  );

  return (
    <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
  );
}
