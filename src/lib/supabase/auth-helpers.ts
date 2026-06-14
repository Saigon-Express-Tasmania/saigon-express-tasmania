import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { updateUserProfile } from "@/lib/supabase/user-profiles";
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

export type WholesaleRegistrationResult = {
  userId: string;
  emailConfirmationRequired: boolean;
};

function buildWholesaleMemberAuthMetadata(
  input: WholesaleMemberRegistration,
): Record<string, unknown> {
  const { first_name, last_name } = splitContactName(input.contactName);

  const metadata: Record<string, unknown> = {
    business_name: input.business_name.trim(),
    first_name,
    last_name,
    contact_name: input.contactName.trim()
  };

  const phone = input.phone?.trim();
  if (phone) metadata.phone = phone;

  const address = input.address?.trim();
  if (address) metadata.address_line1 = address;

  const abn = input.abn?.trim();
  if (abn) metadata.abn = abn;

  const businessCategory = input.business_category?.trim();
  if (businessCategory) metadata.business_category = businessCategory;

  return metadata;
}

export async function registerWholesaleMemberApplication(
  input: WholesaleMemberRegistration,
): Promise<WholesaleRegistrationResult> {
  const { first_name, last_name } = splitContactName(input.contactName);

  const metadata = buildWholesaleMemberAuthMetadata(input);

  const { session, user } = await signUpWithEmail(
    input.email,
    input.password,
    metadata,
  );

  const signedUpUser = session?.user ?? user;
  if (!signedUpUser?.id) {
    throw new Error(
      "Registration could not be completed. Please try again or contact support.",
    );
  }

  // Profile row is created by handle_new_auth_user from signup metadata.
  // updateUserProfile requires an authenticated session.
  if (session?.user) {
    await updateUserProfile(session.user.id, {
      first_name,
      last_name,
      phone: input.phone ?? null,
      address_line1: input.address ?? null,
      business_name: input.business_name,
      abn: input.abn ?? null,
      business_category: input.business_category ?? null,
    });
  }

  return {
    userId: signedUpUser.id,
    emailConfirmationRequired: !session,
  };
}
