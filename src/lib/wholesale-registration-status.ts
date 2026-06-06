import type { BusinessType, UserAuthMetadata, UserProfile } from "@/types/UserProfile";

const STORAGE_KEY = "saigon_wholesale_registration_status";

export type WholesaleRegistrationStatusType = "pending_confirmation";

export type WholesaleRegistrationStatus = {
  email: string;
  businessName: string;
  businessType: Extract<BusinessType, "wholesale" | "warehouse">;
  status: WholesaleRegistrationStatusType;
  submittedAt: string;
  message: string;
};

export const WHOLESALE_REGISTRATION_MESSAGES = {
  pending_confirmation:
    "Registration submitted! An administrator will confirm your account (typically 1–2 business days). You can sign in once your registration has been confirmed.",
  pending_confirmation_banner:
    "Your registration is pending administrator confirmation. Sign in after your account has been confirmed.",
  login_blocked:
    "Your account is pending administrator confirmation. Please try again once your registration has been confirmed.",
} as const;

export function isWholesaleMemberConfirmed(
  profile: Pick<UserProfile, "business_type"> | null,
  authMetadata: UserAuthMetadata,
): boolean {
  if (!profile) return false;

  if (profile.business_type === "wholesale") {
    return authMetadata.user_role === "partner" || authMetadata.is_verified;
  }

  if (profile.business_type === "warehouse") {
    return authMetadata.is_verified;
  }

  return false;
}

export function isWholesaleMemberPendingConfirmation(
  profile: Pick<UserProfile, "business_type"> | null,
  authMetadata: UserAuthMetadata,
): boolean {
  if (!profile) return false;

  const isWholesaleAccount =
    profile.business_type === "wholesale" ||
    profile.business_type === "warehouse";

  return isWholesaleAccount && !isWholesaleMemberConfirmed(profile, authMetadata);
}

export function saveWholesaleRegistrationStatus(
  status: WholesaleRegistrationStatus,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

export function getWholesaleRegistrationStatus(): WholesaleRegistrationStatus | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WholesaleRegistrationStatus;
  } catch {
    return null;
  }
}

export function clearWholesaleRegistrationStatus(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function buildWholesaleRegistrationStatus(input: {
  email: string;
  businessName: string;
  businessType: Extract<BusinessType, "wholesale" | "warehouse">;
}): WholesaleRegistrationStatus {
  return {
    email: input.email.trim().toLowerCase(),
    businessName: input.businessName.trim(),
    businessType: input.businessType,
    status: "pending_confirmation",
    submittedAt: new Date().toISOString(),
    message: WHOLESALE_REGISTRATION_MESSAGES.pending_confirmation,
  };
}

export function resolveWholesaleRegistrationStatus(
  stored: WholesaleRegistrationStatus | null,
  profile: UserProfile | null,
  authMetadata: UserAuthMetadata,
): WholesaleRegistrationStatus | null {
  if (isWholesaleMemberConfirmed(profile, authMetadata)) {
    return null;
  }

  if (isWholesaleMemberPendingConfirmation(profile, authMetadata)) {
    return {
      email: profile!.email ?? stored?.email ?? "",
      businessName: profile!.business_name ?? stored?.businessName ?? "",
      businessType: profile!.business_type as Extract<
        BusinessType,
        "wholesale" | "warehouse"
      >,
      status: "pending_confirmation",
      submittedAt: stored?.submittedAt ?? profile!.updated_at,
      message:
        stored?.message ??
        WHOLESALE_REGISTRATION_MESSAGES.pending_confirmation_banner,
    };
  }

  return stored;
}
