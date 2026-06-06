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
import type { UserProfile, UserProfileSelfUpdate } from "@/types/UserProfile";

export type SupabaseContextValue = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setProfile(null);
      return;
    }

    const row = await fetchUserProfile(userId);
    setProfile(row);
  }, [user?.id]);

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
          const row = await fetchUserProfile(initialSession.user.id);
          if (mounted) setProfile(row);
        }
      } catch (error) {
        console.error("Error initializing Supabase session:", error);
      } finally {
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
      setIsLoading(false);

      if (newSession?.user) {
        try {
          const row = await fetchUserProfile(newSession.user.id);
          setProfile(row);
        } catch (error) {
          console.error("Error loading profile after auth change:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const nextSession = await signInWithEmail(email, password);
    setSession(nextSession);
    setUser(nextSession.user);

    const row = await fetchUserProfile(nextSession.user.id);
    setProfile(row);
  }, []);

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

        const row = await fetchUserProfile(result.session.user.id);
        setProfile(row);
      }

      return result;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

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
      isLoading,
      isSignedIn: Boolean(session?.user),
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshProfile,
      updateOwnProfile,
    }),
    [
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
