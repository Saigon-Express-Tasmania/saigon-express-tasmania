import { hasPortalPrivilege, hasPrivilege } from "@/lib/privileges";
import type { BusinessType, UserAuthMetadata, UserProfile } from "@/types/UserProfile";

const STORAGE_KEY = "saigon_wholesale_registration_status";

export type WholesaleRegistrationStatusType = "pending_approval";

export type WholesaleRegistrationStatus = {
  email: string;
  businessName: string;
  businessType: Extract<BusinessType, "wholesale" | "warehouse">;
  status: WholesaleRegistrationStatusType;
  submittedAt: string;
  message: string;
};

export const WHOLESALE_REGISTRATION_MESSAGES = {
  pending_approval:
    "Registration submitted! You can sign in anytime. Portal access requires administrator approval (typically 1–2 business days).",
  pending_approval_banner:
    "Your registration is pending administrator approval. You can sign in, but wholesale portal features are not available yet.",
} as const;

export function isWholesaleMemberConfirmed(
  _profile: UserProfile | null,
  authMetadata: UserAuthMetadata,
): boolean {
  return (
    authMetadata.user_role === "partner" || hasPortalPrivilege(authMetadata.privileges)
  );
}

export function isWholesaleMemberPendingApproval(
  profile: UserProfile | null,
  authMetadata: UserAuthMetadata,
  requestedType?: Extract<BusinessType, "wholesale" | "warehouse">,
): boolean {
  if (!profile) return false;

  const isBusinessRegistration = Boolean(profile.business_name?.trim());
  if (!isBusinessRegistration) return false;

  if (requestedType) {
    return !hasPrivilege(authMetadata.privileges, requestedType);
  }

  return !hasPortalPrivilege(authMetadata.privileges);
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
    status: "pending_approval",
    submittedAt: new Date().toISOString(),
    message: WHOLESALE_REGISTRATION_MESSAGES.pending_approval,
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

  const requestedType = stored?.businessType ?? "wholesale";

  if (isWholesaleMemberPendingApproval(profile, authMetadata, requestedType)) {
    return {
      email: profile?.email ?? stored?.email ?? "",
      businessName: profile?.business_name ?? stored?.businessName ?? "",
      businessType: requestedType,
      status: "pending_approval",
      submittedAt: stored?.submittedAt ?? profile?.updated_at ?? new Date().toISOString(),
      message:
        stored?.message ?? WHOLESALE_REGISTRATION_MESSAGES.pending_approval_banner,
    };
  }

  return stored;
}
