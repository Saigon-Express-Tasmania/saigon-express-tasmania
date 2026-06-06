"use client";

import { useContext } from "react";
import { SupabaseContext } from "@/contexts/SupabaseContext";

export {
  AlreadyRegisteredError,
  getAuthErrorMessage,
  isAlreadyRegisteredAuthError,
  registerWholesaleMemberApplication,
  type WholesaleRegistrationResult,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  splitContactName,
} from "@/lib/supabase/auth-helpers";
export {
  fetchUserProfile,
  sanitizeProfileSelfUpdate,
  updateUserProfile,
} from "@/lib/supabase/user-profiles";
export { supabase } from "@/lib/supabase/client";

/**
 * Access Supabase auth session, user profile, and auth/profile helpers.
 *
 * Usage:
 * const { user, profile, isSignedIn, signInWithPassword, updateOwnProfile } = useSupabase();
 */
export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }
  return context;
}
