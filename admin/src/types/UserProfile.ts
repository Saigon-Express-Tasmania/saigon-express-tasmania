export type UserRole = 'none' | 'user' | 'admin' | 'partner';

export type BusinessType = 'personal' | 'wholesale' | 'warehouse' | 'franchise';

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
  user_role: UserRole;
  privileges: BusinessType[];
  membership_level: number;
  created_at: string;
  updated_at: string;
};

export type UserProfileUpdate = Partial<
  Omit<UserProfile, 'id' | 'display_name' | 'created_at' | 'updated_at' | 'user_role' | 'privileges'>
>;

export type AdminUserProfileUpdate = Partial<
  Omit<UserProfile, 'id' | 'display_name' | 'created_at' | 'updated_at'>
>;

export type PartnerBusinessType = Extract<BusinessType, 'wholesale' | 'warehouse'>;

export type AdminPartnerInput = {
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  suburb: string;
  state: string;
  postal_code: string;
  country: string;
  business_name: string;
  abn: string;
  business_category: string;
  user_role: UserRole;
  privileges: BusinessType[];
  date_of_birth: string;
};
