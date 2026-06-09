import { requireAdmin } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type BusinessType = "personal" | "wholesale" | "warehouse" | "franchise";

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

function nullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
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

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as Record<string, unknown>;

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
