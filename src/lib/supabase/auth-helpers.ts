import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import { SITE_ORIGIN } from "@/lib/site-origin";
import type { BusinessType } from "@/types/UserProfile";

export type WholesaleMemberMetadata = {
  business_name: string;
  first_name: string;
  last_name: string | null;
  contact_name: string;
  phone?: string;
  address_line1?: string;
  abn?: string;
  business_category?: string;
};

/** Form payload for wholesale/warehouse member registration. */
export type WholesaleMemberRegistration = {
  business_name: string;
  contactName: string;
  email: string;
  password: string;
  phone?: string;
  abn?: string;
  business_category?: string;
  address?: string;
  business_type: Extract<BusinessType, "wholesale" | "warehouse">;
};

export function splitContactName(contactName: string): {
  first_name: string;
  last_name: string | null;
} {
  const trimmed = contactName.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return { first_name: trimmed, last_name: null };
  }

  return {
    first_name: trimmed.slice(0, spaceIndex),
    last_name: trimmed.slice(spaceIndex + 1).trim() || null,
  };
}

export class AlreadyRegisteredError extends Error {
  constructor() {
    super(
      "An account with this email already exists. Please sign in instead.",
    );
    this.name = "AlreadyRegisteredError";
  }
}

export function isAlreadyRegisteredAuthError(error: unknown): boolean {
  if (error instanceof AlreadyRegisteredError) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const authError = error as { message?: string; code?: string };
  const message = (authError.message ?? "").toLowerCase();

  return (
    authError.code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  );
}

export function isEmailNotConfirmedAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const authError = error as { message?: string; code?: string };
  const message = (authError.message ?? "").toLowerCase();

  return (
    authError.code === "email_not_confirmed" ||
    message.includes("email not confirmed")
  );
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AlreadyRegisteredError) {
    return error.message;
  }

  if (isAlreadyRegisteredAuthError(error)) {
    return "An account with this email already exists. Please sign in instead.";
  }

  if (isEmailNotConfirmedAuthError(error)) {
    return "Please confirm your email address before signing in. Check your inbox for the confirmation link.";
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    if (message) return message;
  }

  return fallback;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error("Sign-in failed. Please try again.");
  }

  return data.session;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: Record<string, unknown>,
): Promise<{ session: Session | null; user: User | null }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: metadata ? { data: metadata } : undefined,
  });

  if (error) {
    if (isAlreadyRegisteredAuthError(error)) {
      throw new AlreadyRegisteredError();
    }
    throw error;
  }

  // Supabase returns an empty identities array when the email is already taken
  // (avoids leaking whether the address exists when confirmation is enabled).
  if (data.user?.identities?.length === 0) {
    throw new AlreadyRegisteredError();
  }

  return { session: data.session, user: data.user };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export function getMemberPortalPasswordResetRedirectUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/member`;
  }

  return `${SITE_ORIGIN}/member`;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: getMemberPortalPasswordResetRedirectUrl(),
    },
  );

  if (error) {
    throw error;
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw error;
  }
}

export type WholesaleRegistrationResult = {
  userId: string;
  emailConfirmationRequired: boolean;
};

export async function registerWholesaleMemberApplication(
  input: WholesaleMemberRegistration,
): Promise<WholesaleRegistrationResult> {
  const result = await invokeEdgeFunction<{
    userId: string;
    emailConfirmationRequired: boolean;
  }>("admin-partner", {
    body: {
      action: "register",
      business_name: input.business_name,
      contactName: input.contactName,
      email: input.email,
      password: input.password,
      phone: input.phone,
      abn: input.abn,
      business_category: input.business_category,
      address: input.address,
      business_type: input.business_type,
    },
  });

  if (!result.ok) {
    if (isAlreadyRegisteredAuthError({ message: result.error })) {
      throw new AlreadyRegisteredError();
    }
    throw new Error(result.error);
  }

  return {
    userId: result.data.userId,
    emailConfirmationRequired: result.data.emailConfirmationRequired,
  };
}
