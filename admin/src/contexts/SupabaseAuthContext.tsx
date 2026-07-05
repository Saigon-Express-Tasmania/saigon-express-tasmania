import {
  isAuthFailureError,
  markSessionExpired,
  registerAuthFailureHandler,
} from '@/lib/auth-session';
import supabase from '@/lib/supabase/client';
import { parseUserRole } from '@/lib/user-metadata';
import { type Session, type User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';

export type SupabaseAuth = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const SupabaseAuthContext = createContext<SupabaseAuth>({
  user: null,
  session: null,
  isLoading: true,
  isSignedIn: false,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

function ensureAdminAccess(session: Session) {
  const userRole = parseUserRole(session.user.app_metadata?.user_role);

  if (userRole !== 'admin') {
    throw new Error('Access denied. Admin account required.');
  }
}

async function clearInvalidSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Session may already be invalid on the server.
  }
}

export function SupabaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isHandlingAuthFailureRef = useRef(false);

  const applySignedOutState = useCallback(() => {
    setSession(null);
    setUser(null);
  }, []);

  const handleAuthFailure = useCallback(async () => {
    if (isHandlingAuthFailureRef.current) return;
    isHandlingAuthFailureRef.current = true;

    try {
      markSessionExpired();
      applySignedOutState();
      await clearInvalidSession();
    } finally {
      isHandlingAuthFailureRef.current = false;
    }
  }, [applySignedOutState]);

  const resolveAuthSession = useCallback(async (options?: { keepExistingOnError?: boolean }) => {
    const {
      data: { user: validatedUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      if (isAuthFailureError(userError)) {
        await handleAuthFailure();
        return { user: null, session: null };
      }

      if (options?.keepExistingOnError) {
        return null;
      }

      throw userError;
    }

    if (!validatedUser) {
      applySignedOutState();
      return { user: null, session: null };
    }

    const {
      data: { session: activeSession },
    } = await supabase.auth.getSession();

    if (!activeSession) {
      await handleAuthFailure();
      return { user: null, session: null };
    }

    try {
      ensureAdminAccess(activeSession);
    } catch {
      await handleAuthFailure();
      return { user: null, session: null };
    }

    return { user: validatedUser, session: activeSession };
  }, [applySignedOutState, handleAuthFailure]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const resolved = await resolveAuthSession();
        if (!mounted || !resolved) return;
        setSession(resolved.session);
        setUser(resolved.user);
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) applySignedOutState();
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'TOKEN_REFRESHED') {
        if (!newSession?.user) {
          void handleAuthFailure();
          return;
        }

        setSession(newSession);
        return;
      }

      if (event === 'SIGNED_OUT') {
        applySignedOutState();
        setIsLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (!newSession?.user) {
        applySignedOutState();
        setIsLoading(false);
        return;
      }

      try {
        ensureAdminAccess(newSession);
      } catch {
        void handleAuthFailure();
        return;
      }

      setSession(newSession);
      setUser(newSession.user);
      setIsLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, [applySignedOutState, handleAuthFailure, resolveAuthSession]);

  useEffect(() => {
    return registerAuthFailureHandler(() => {
      void handleAuthFailure();
    });
  }, [handleAuthFailure]);

  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState === 'hidden') return;
      void resolveAuthSession({ keepExistingOnError: true }).then((resolved) => {
        if (!resolved) return;
        setSession(resolved.session);
        setUser(resolved.user);
      });
    };

    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);

    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [resolveAuthSession]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    const userId = data.user?.id;
    if (!userId || !data.session) {
      await supabase.auth.signOut();
      throw new Error('Sign-in failed. Please try again.');
    }

    try {
      ensureAdminAccess(data.session);
    } catch (adminCheckError) {
      await supabase.auth.signOut();
      throw adminCheckError;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    session,
    isLoading,
    isSignedIn: !!user && !!session,
    signUp,
    signIn,
    signOut,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}
