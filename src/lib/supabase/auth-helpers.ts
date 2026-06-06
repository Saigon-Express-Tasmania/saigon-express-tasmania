import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { updateUserProfile } from "@/lib/supabase/user-profiles";
import type { BusinessType } from "@/types/UserProfile";

export type WholesaleMemberMetadata = {
  business_name: string;
  abn?: string;
  business_category?: string;
  portal_type: "wholesale" | "warehouse";
};

export type WholesaleMemberRegistration = WholesaleMemberMetadata & {
  email: string;
  password: string;
  contactName: string;
  phone?: string;
  address?: string;
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

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AlreadyRegisteredError) {
    return error.message;
  }

  if (isAlreadyRegisteredAuthError(error)) {
    return "An account with this email already exists. Please sign in instead.";
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
): Promise<{ session: Session | null }> {
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

  return { session: data.session };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function registerWholesaleMemberApplication(
  input: WholesaleMemberRegistration,
): Promise<void> {
  const { first_name, last_name } = splitContactName(input.contactName);
  const businessType = input.portal_type as BusinessType;

  const metadata: Record<string, unknown> = {
    business_name: input.business_name,
    portal_type: input.portal_type,
  };

  if (input.abn) metadata.abn = input.abn;
  if (input.business_category) metadata.business_category = input.business_category;

  const { session } = await signUpWithEmail(input.email, input.password, metadata);

  if (!session?.user) {
    return;
  }

  await updateUserProfile(session.user.id, {
    first_name,
    last_name,
    phone: input.phone ?? null,
    address_line1: input.address ?? null,
    address_line2: input.business_name,
    business_type: businessType,
  });
}
