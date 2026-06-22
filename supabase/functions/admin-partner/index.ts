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
    console.error("[admin-partner]", message);
    return jsonResponse({ error: message }, 400);
  }
});
