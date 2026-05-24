import { SupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useContext } from 'react';

/**
 * Hook to access Supabase auth state and methods
 *
 * Usage:
 * const { user, isSignedIn, signIn, signOut } = useSupabaseAuth();
 */
export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
}
