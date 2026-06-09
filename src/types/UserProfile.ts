export type UserRole = "none" | "user" | "admin" | "partner";

export type BusinessType = "personal" | "wholesale" | "warehouse" | "franchise";

/** Role and privileges from JWT app_metadata (stored in user_metadata). */
export type UserAuthMetadata = {
  user_role: UserRole;
  privileges: BusinessType[];
};

export type UserProfile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  date_of_birth: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  suburb: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  business_name: string | null;
  abn: string | null;
  business_category: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

/** Fields a signed-in user may update on their own profile row. */
export type UserProfileSelfUpdate = Partial<
  Omit<UserProfile, "id" | "display_name" | "created_at" | "updated_at">
>;
