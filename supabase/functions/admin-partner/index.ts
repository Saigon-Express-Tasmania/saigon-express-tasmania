import { requireAdmin } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  sendNewPartnerRegisteredEmail,
  type NewPartnerRegisteredInput,
} from "../_shared/new-partner-registered-email.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type BusinessType = "personal" | "wholesale" | "warehouse" | "franchise";
type PortalType = "wholesale" | "warehouse";

type PartnerProfileInput = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  suburb?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  business_name?: string | null;
  abn?: string | null;
  business_category?: string | null;
  user_role?: "none" | "user" | "admin" | "partner";
  privileges?: BusinessType[];
  date_of_birth?: string | null;
};

type MemberRegisterInput = {
  business_name: string;
  contactName: string;
  email: string;
  password: string;
  phone?: string | null;
  abn?: string | null;
  business_category?: string | null;
  address?: string | null;
  business_type: PortalType;
};

function nullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function splitContactName(contactName: string): {
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

function isAlreadyRegisteredError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const authError = error as { message?: string; code?: string };
  const message = (authError.message ?? "").toLowerCase();

  return (
    authError.code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  );
}

async function confirmUserEmail(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<void> {
  const { error } = await service.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) throw error;
}

function parsePrivileges(value: unknown): BusinessType[] {
  if (!Array.isArray(value)) return ["personal"];

  const privileges = value.filter(
    (item): item is BusinessType =>
      item === "personal" ||
      item === "wholesale" ||
      item === "warehouse" ||
      item === "franchise",
  );

  return privileges.length > 0 ? privileges : ["personal"];
}

function parsePartnerProfile(data: Record<string, unknown>): PartnerProfileInput {
  const userRole = data.user_role != null ? String(data.user_role).trim() : "user";
  if (!["none", "user", "admin", "partner"].includes(userRole)) {
    throw new Error("Invalid user_role");
  }

  return {
    first_name: nullableString(data.first_name),
    last_name: nullableString(data.last_name),
    phone: nullableString(data.phone),
    address_line1: nullableString(data.address_line1),
    address_line2: nullableString(data.address_line2),
    city: nullableString(data.city),
    suburb: nullableString(data.suburb),
    state: nullableString(data.state),
    postal_code: nullableString(data.postal_code),
    country: nullableString(data.country) ?? "AU",
    business_name: nullableString(data.business_name),
    abn: nullableString(data.abn),
    business_category: nullableString(data.business_category),
    user_role: userRole as PartnerProfileInput["user_role"],
    privileges: parsePrivileges(data.privileges),
    date_of_birth: nullableString(data.date_of_birth),
  };
}

function parsePortalType(value: unknown): PortalType {
  const raw = nullableString(value);
  if (raw === "warehouse") return "warehouse";
  return "wholesale";
}

function mergePrivileges(current: BusinessType[], grant: BusinessType): BusinessType[] {
  return [...new Set([...current, grant])].sort();
}

type FranchiseInterestRow = {
  id: number;
  interest_type: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  business_name: string | null;
  business_type: string | null;
  investment_budget: string | null;
  business_experience: string | null;
  status: string;
};

type FranchiseProfilePreview = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  state: string | null;
  business_name: string | null;
  location_address: string | null;
  investment_amount: string | null;
  country: string;
  user_role: PartnerProfileInput["user_role"];
  privileges: BusinessType[];
};

type ExistingFranchiseUser = FranchiseProfilePreview & {
  userId: string;
  city: string | null;
  business_category: string | null;
};

function formatFranchiseLocationAddress(
  city: string | null,
  state: string | null,
): string | null {
  const parts = [city, state].filter((value) => value && value.trim());
  return parts.length > 0 ? parts.join(", ") : null;
}

function mapFranchiseInterestToProfile(interest: FranchiseInterestRow): FranchiseProfilePreview {
  const { first_name, last_name } = splitContactName(interest.full_name);

  return {
    email: interest.email.trim().toLowerCase(),
    first_name,
    last_name,
    phone: nullableString(interest.phone),
    state: nullableString(interest.state),
    business_name: nullableString(interest.business_name),
    location_address: formatFranchiseLocationAddress(
      nullableString(interest.city),
      nullableString(interest.state),
    ),
    investment_amount: nullableString(interest.investment_budget),
    country: "AU",
    user_role: "user",
    privileges: ["personal", "franchise"],
  };
}

function parseFranchiseInterestId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("franchiseInterestId is required");
  }
  return id;
}

async function fetchApprovedFranchiseInterest(
  service: ReturnType<typeof createServiceClient>,
  franchiseInterestId: number,
): Promise<FranchiseInterestRow> {
  const { data, error } = await service
    .from("franchise_interests")
    .select(
      "id, interest_type, full_name, email, phone, city, state, business_name, business_type, investment_budget, business_experience, status",
    )
    .eq("id", franchiseInterestId)
    .eq("interest_type", "franchise")
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Approved franchise interest not found");
  }

  return data as FranchiseInterestRow;
}

async function findUserByEmail(
  service: ReturnType<typeof createServiceClient>,
  email: string,
): Promise<ExistingFranchiseUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data: profile, error: profileError } = await service
    .from("user_profiles")
    .select(
      "id, email, first_name, last_name, phone, city, state, business_name, business_category, location_address, investment_amount",
    )
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) return null;

  const { data: metadata, error: metadataError } = await service
    .from("user_metadata")
    .select("user_role, privileges")
    .eq("id", profile.id)
    .single();

  if (metadataError) throw metadataError;

  return {
    userId: profile.id,
    email: profile.email ?? normalizedEmail,
    first_name: nullableString(profile.first_name),
    last_name: nullableString(profile.last_name),
    phone: nullableString(profile.phone),
    state: nullableString(profile.state),
    business_name: nullableString(profile.business_name),
    location_address: nullableString(profile.location_address),
    investment_amount: nullableString(profile.investment_amount),
    country: "AU",
    user_role: (metadata.user_role ?? "user") as PartnerProfileInput["user_role"],
    privileges: parsePrivileges(metadata.privileges),
    city: nullableString(profile.city),
    business_category: nullableString(profile.business_category),
  };
}

function coalesceFranchiseProfileUpdate(
  existing: ExistingFranchiseUser,
  fromInterest: FranchiseProfilePreview,
): Record<string, string | null> {
  return {
    location_address: existing.location_address ?? fromInterest.location_address,
    investment_amount: existing.investment_amount ?? fromInterest.investment_amount,
  };
}

async function resolveFranchiseInterest(
  service: ReturnType<typeof createServiceClient>,
  franchiseInterestId: number,
): Promise<void> {
  const { data, error } = await service
    .from("franchise_interests")
    .update({ status: "resolved" })
    .eq("id", franchiseInterestId)
    .eq("interest_type", "franchise")
    .eq("status", "approved")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Franchise interest is no longer approved");
  }
}

async function handlePreviewFranchiseAccount(body: Record<string, unknown>) {
  const franchiseInterestId = parseFranchiseInterestId(body.franchiseInterestId);
  const service = createServiceClient();
  const interest = await fetchApprovedFranchiseInterest(service, franchiseInterestId);
  const preview = mapFranchiseInterestToProfile(interest);
  const existingUser = await findUserByEmail(service, preview.email);
  const alreadyHasFranchise = existingUser?.privileges.includes("franchise") ?? false;
  const mergedPreview = existingUser
    ? {
        ...existingUser,
        privileges: alreadyHasFranchise
          ? existingUser.privileges
          : mergePrivileges(existingUser.privileges, "franchise"),
        location_address:
          existingUser.location_address ?? preview.location_address,
        investment_amount:
          existingUser.investment_amount ?? preview.investment_amount,
      }
    : preview;

  return {
    franchiseInterestId,
    emailExists: existingUser != null,
    alreadyHasFranchise,
    passwordRequired: existingUser == null,
    preview: mergedPreview,
    existingUser,
  };
}

async function grantFranchisePrivilegeToExistingUser(
  service: ReturnType<typeof createServiceClient>,
  existingUser: ExistingFranchiseUser,
  fromInterest: FranchiseProfilePreview,
): Promise<string> {
  const privileges = existingUser.privileges.includes("franchise")
    ? existingUser.privileges
    : mergePrivileges(existingUser.privileges, "franchise");

  const { error: profileError } = await service
    .from("user_profiles")
    .update(coalesceFranchiseProfileUpdate(existingUser, fromInterest))
    .eq("id", existingUser.userId);

  if (profileError) throw profileError;

  if (!existingUser.privileges.includes("franchise")) {
    const { error: metadataError } = await service
      .from("user_metadata")
      .update({ privileges })
      .eq("id", existingUser.userId);

    if (metadataError) throw metadataError;

    const { error: syncError } = await service.rpc("sync_auth_user_metadata", {
      target_user_id: existingUser.userId,
    });

    if (syncError) throw syncError;
  }

  return existingUser.userId;
}

async function createFranchiseUserFromInterest(
  service: ReturnType<typeof createServiceClient>,
  preview: FranchiseProfilePreview,
  password: string,
): Promise<string> {
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: preview.email,
    password,
    email_confirm: true,
    user_metadata: buildUserMetadata({
      first_name: preview.first_name,
      last_name: preview.last_name,
      phone: preview.phone,
      business_name: preview.business_name,
      country: preview.country,
    }),
  });

  if (createError) {
    if (isAlreadyRegisteredError(createError)) {
      throw new Error("An account with this email already exists.");
    }
    throw createError;
  }

  const userId = created.user?.id;
  if (!userId) {
    throw new Error("Failed to create auth user");
  }

  const { error: updateError } = await service
    .from("user_profiles")
    .update({
      email: preview.email,
      first_name: preview.first_name,
      last_name: preview.last_name,
      phone: preview.phone,
      state: preview.state,
      business_name: preview.business_name,
      location_address: preview.location_address,
      investment_amount: preview.investment_amount,
      country: preview.country,
    })
    .eq("id", userId);

  if (updateError) {
    await service.auth.admin.deleteUser(userId);
    throw updateError;
  }

  const { error: metadataError } = await service
    .from("user_metadata")
    .update({
      user_role: "user",
      privileges: ["personal", "franchise"],
    })
    .eq("id", userId);

  if (metadataError) {
    await service.auth.admin.deleteUser(userId);
    throw metadataError;
  }

  const { error: syncError } = await service.rpc("sync_auth_user_metadata", {
    target_user_id: userId,
  });

  if (syncError) {
    await service.auth.admin.deleteUser(userId);
    throw syncError;
  }

  return userId;
}

async function handleCompleteFranchiseAccount(body: Record<string, unknown>) {
  const franchiseInterestId = parseFranchiseInterestId(body.franchiseInterestId);
  const password = body.password != null ? String(body.password) : "";
  const service = createServiceClient();
  const interest = await fetchApprovedFranchiseInterest(service, franchiseInterestId);
  const preview = mapFranchiseInterestToProfile(interest);
  const existingUser = await findUserByEmail(service, preview.email);

  let userId: string;
  let created = false;

  if (existingUser) {
    userId = await grantFranchisePrivilegeToExistingUser(service, existingUser, preview);
  } else {
    if (password.length < 8) {
      throw new Error("password must be at least 8 characters");
    }
    userId = await createFranchiseUserFromInterest(service, preview, password);
    created = true;
  }

  await confirmUserEmail(service, userId);
  await resolveFranchiseInterest(service, franchiseInterestId);

  return {
    userId,
    created,
    franchiseInterestId,
  };
}

function parseMemberRegisterInput(data: Record<string, unknown>): MemberRegisterInput {
  const business_name = nullableString(data.business_name);
  const contactName = nullableString(data.contactName);
  const email = nullableString(data.email);
  const password = data.password != null ? String(data.password) : "";

  if (!business_name) {
    throw new Error("business_name is required");
  }
  if (!contactName) {
    throw new Error("contactName is required");
  }
  if (!email) {
    throw new Error("email is required");
  }
  if (password.length < 8) {
    throw new Error("password must be at least 8 characters");
  }

  return {
    business_name,
    contactName,
    email,
    password,
    phone: nullableString(data.phone),
    abn: nullableString(data.abn),
    business_category: nullableString(data.business_category),
    address: nullableString(data.address),
    business_type: parsePortalType(data.business_type),
  };
}

function buildUserMetadata(profile: PartnerProfileInput): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  if (profile.first_name) metadata.first_name = profile.first_name;
  if (profile.last_name) metadata.last_name = profile.last_name;
  if (profile.phone) metadata.phone = profile.phone;
  if (profile.address_line1) metadata.address_line1 = profile.address_line1;
  if (profile.business_name) metadata.business_name = profile.business_name;
  if (profile.abn) metadata.abn = profile.abn;
  if (profile.business_category) metadata.business_category = profile.business_category;

  return metadata;
}

function buildMemberRegisterMetadata(
  input: MemberRegisterInput,
): Record<string, unknown> {
  const { first_name, last_name } = splitContactName(input.contactName);

  const metadata: Record<string, unknown> = {
    business_name: input.business_name,
    first_name,
    last_name,
    contact_name: input.contactName,
  };

  if (input.phone) metadata.phone = input.phone;
  if (input.address) metadata.address_line1 = input.address;
  if (input.abn) metadata.abn = input.abn;
  if (input.business_category) metadata.business_category = input.business_category;

  return metadata;
}

function buildNewPartnerRegisteredEmailInput(
  input: MemberRegisterInput,
  userId: string,
): NewPartnerRegisteredInput {
  return {
    userId,
    portalType: input.business_type,
    business_name: input.business_name,
    contactName: input.contactName,
    email: input.email,
    phone: input.phone,
    abn: input.abn,
    business_category: input.business_category,
    address: input.address,
  };
}

async function handleMemberRegister(body: Record<string, unknown>) {
  const input = parseMemberRegisterInput(body);
  const { first_name, last_name } = splitContactName(input.contactName);
  const service = createServiceClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: buildMemberRegisterMetadata(input),
  });

  if (createError) {
    if (isAlreadyRegisteredError(createError)) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }
    throw createError;
  }

  const userId = created.user?.id;
  if (!userId) {
    throw new Error("Failed to create auth user");
  }

  const { data: updatedProfile, error: updateError } = await service
    .from("user_profiles")
    .update({
      email: input.email,
      first_name,
      last_name,
      phone: input.phone,
      address_line1: input.address,
      business_name: input.business_name,
      abn: input.abn,
      business_category: input.business_category,
    })
    .eq("id", userId)
    .select("id, created_at")
    .single();

  if (updateError) {
    await service.auth.admin.deleteUser(userId);
    throw updateError;
  }

  const { error: metadataError } = await service
    .from("user_metadata")
    .update({
      user_role: "user",
      privileges: ["personal"],
    })
    .eq("id", userId);

  if (metadataError) {
    await service.auth.admin.deleteUser(userId);
    throw metadataError;
  }

  const { error: syncError } = await service.rpc("sync_auth_user_metadata", {
    target_user_id: userId,
  });

  if (syncError) {
    await service.auth.admin.deleteUser(userId);
    throw syncError;
  }

  try {
    await sendNewPartnerRegisteredEmail({
      ...buildNewPartnerRegisteredEmailInput(input, userId),
      registeredAt: updatedProfile.created_at,
    });
  } catch (err) {
    console.error(
      `[admin-partner] Failed to send new partner registered email for ${userId}:`,
      err,
    );
  }

  return {
    userId: updatedProfile.id,
    emailConfirmationRequired: false,
  };
}

async function handleCreate(body: Record<string, unknown>) {
  const email = nullableString(body.email);
  const password = body.password != null ? String(body.password) : "";

  if (!email) {
    throw new Error("email is required");
  }
  if (password.length < 8) {
    throw new Error("password must be at least 8 characters");
  }

  const profile = parsePartnerProfile(body);
  const service = createServiceClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: buildUserMetadata(profile),
  });

  if (createError) {
    throw createError;
  }

  const userId = created.user?.id;
  if (!userId) {
    throw new Error("Failed to create auth user");
  }

  const { data: updatedProfile, error: updateError } = await service
    .from("user_profiles")
    .update({
      email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone,
      address_line1: profile.address_line1,
      address_line2: profile.address_line2,
      city: profile.city,
      suburb: profile.suburb,
      state: profile.state,
      postal_code: profile.postal_code,
      country: profile.country,
      business_name: profile.business_name,
      abn: profile.abn,
      business_category: profile.business_category,
      date_of_birth: profile.date_of_birth,
    })
    .eq("id", userId)
    .select("id")
    .single();

  if (updateError) {
    await service.auth.admin.deleteUser(userId);
    throw updateError;
  }

  const { error: metadataError } = await service
    .from("user_metadata")
    .update({
      user_role: profile.user_role ?? "user",
      privileges: profile.privileges ?? ["personal"],
    })
    .eq("id", userId);

  if (metadataError) {
    await service.auth.admin.deleteUser(userId);
    throw metadataError;
  }

  const { error: syncError } = await service.rpc("sync_auth_user_metadata", {
    target_user_id: userId,
  });

  if (syncError) {
    await service.auth.admin.deleteUser(userId);
    throw syncError;
  }

  return { userId: updatedProfile.id };
}

async function handleDelete(body: Record<string, unknown>) {
  const userId = nullableString(body.userId);
  if (!userId) {
    throw new Error("userId is required");
  }

  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }

  return { userId };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action != null ? String(body.action).trim() : "";

    if (req.method === "POST" && action === "register") {
      const result = await handleMemberRegister(body);
      return jsonResponse(result);
    }

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    if (req.method === "POST") {
      if (action === "preview-franchise-account") {
        const result = await handlePreviewFranchiseAccount(body);
        return jsonResponse(result);
      }

      if (action === "complete-franchise-account") {
        const result = await handleCompleteFranchiseAccount(body);
        return jsonResponse(result);
      }

      const result = await handleCreate(body);
      return jsonResponse(result);
    }

    if (req.method === "DELETE") {
      const result = await handleDelete(body);
      return jsonResponse(result);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    console.error("[admin-partner]", message, error);
    return jsonResponse({ error: message }, 400);
  }
});
