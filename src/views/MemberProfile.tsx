"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppImage from "@/components/AppImage";
import WholesaleFormSelect, {
  type WholesaleFormSelectOption,
} from "@/components/WholesaleFormSelect";
import MemberHeader from "@/components/MemberHeader";
import MemberPrivilegeBadges from "@/components/MemberPrivilegeBadges";
import { useSupabase } from "@/hooks/useSupabase";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { resizeImageFile } from "@/lib/image-resize";
import { resolvePortalType } from "@/lib/privileges";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import type { BusinessType, UserProfile, UserProfileSelfUpdate } from "@/types";
import { Loader2, Upload, User, X } from "lucide-react";
import { toast } from "sonner";

const AVATAR_MAX_SIZE_PX = 256;
const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const BUSINESS_CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "catering", label: "Catering" },
  { value: "retail", label: "Retail" },
  { value: "hotel", label: "Hotel" },
  { value: "school", label: "School" },
  { value: "corporate", label: "Corporate" },
  { value: "other", label: "Other" },
] as const;

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

const COUNTRY_OPTIONS = [{ value: "AU", label: "Australia" }] as const;

type ProfileFormState = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
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
};

const INPUT_CLASS =
  "w-full rounded-lg border border-white/15 bg-white/8 px-3 py-2.5 text-sm text-white placeholder-white/25 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50";

const LABEL_CLASS = "text-xs font-medium text-white/80";

function getContactName(profile: UserProfile): string {
  if (profile.business_name?.trim()) return profile.business_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

function getInitials(profile: UserProfile): string {
  const first = profile.first_name?.trim()?.[0] ?? "";
  const last = profile.last_name?.trim()?.[0] ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return "?";
}

function formatProfileDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function businessCategoryLabel(value: string | null): string {
  if (!value) return "";
  return (
    BUSINESS_CATEGORIES.find((option) => option.value === value)?.label ?? value
  );
}

function businessTypeLabel(privileges: BusinessType[]): string {
  if (privileges.includes("warehouse")) return "Warehouse";
  if (privileges.includes("wholesale")) return "Wholesale";
  return "Personal";
}

function profileToForm(profile: UserProfile): ProfileFormState {
  return {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    date_of_birth: profile.date_of_birth ?? "",
    phone: profile.phone ?? "",
    address_line1: profile.address_line1 ?? "",
    address_line2: profile.address_line2 ?? "",
    city: profile.city ?? "",
    suburb: profile.suburb ?? "",
    state: profile.state ?? "",
    postal_code: profile.postal_code ?? "",
    country: profile.country ?? "AU",
    business_name: profile.business_name ?? "",
    abn: profile.abn ?? "",
    business_category: profile.business_category ?? "",
  };
}

function fileMatchesAccept(file: File, accept: string): boolean {
  const type = file.type.toLowerCase();
  if (!type) return false;

  return accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .some((accepted) => {
      if (accepted.endsWith("/*")) {
        const prefix = accepted.slice(0, -1);
        return type.startsWith(prefix);
      }
      return type === accepted;
    });
}

function formToUpdate(form: ProfileFormState): UserProfileSelfUpdate {
  const trim = (value: string) => value.trim() || null;
  return {
    first_name: trim(form.first_name),
    last_name: trim(form.last_name),
    date_of_birth: trim(form.date_of_birth),
    phone: trim(form.phone),
    address_line1: trim(form.address_line1),
    address_line2: trim(form.address_line2),
    city: trim(form.city),
    suburb: trim(form.suburb),
    state: trim(form.state),
    postal_code: trim(form.postal_code),
    country: trim(form.country) ?? "AU",
    business_name: trim(form.business_name),
    abn: trim(form.abn),
    business_category: trim(form.business_category),
  };
}

export default function MemberProfile() {
  const router = useRouter();
  const { profile, authMetadata, isLoading, signOut, updateOwnProfile } =
    useSupabase();
  const { uploadMedia, isUploading } = useSupabaseStorage();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const me = useMemo(() => {
    if (!profile || !isWholesaleMemberConfirmed(profile, authMetadata)) {
      return null;
    }
    return {
      businessName: profile.business_name ?? "Your Business",
      contactName: getContactName(profile),
      portalType: resolvePortalType(authMetadata.privileges),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || avatarPreviewUrl,
    };
  }, [profile, authMetadata, avatarPreviewUrl]);

  useEffect(() => {
    if (!isLoading && !me) {
      router.push("/member");
    }
  }, [me, isLoading, router]);

  useEffect(() => {
    if (profile) {
      setForm(profileToForm(profile));
      setAvatarPreviewUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleAvatarUpload = async (file: File) => {
    if (!fileMatchesAccept(file, AVATAR_ACCEPT)) {
      toast.error("Please choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    try {
      const resized = await resizeImageFile(file, AVATAR_MAX_SIZE_PX);
      const ext = resized.name.split(".").pop()?.toLowerCase() || "jpg";
      const { publicUrl } = await uploadMedia(resized, {
        folder: "avatars",
        fileName: `avatar.${ext}`,
        upsert: true,
      });
      await updateOwnProfile({ avatar_url: publicUrl });
      setAvatarPreviewUrl(publicUrl);
      toast.success("Avatar updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload avatar.",
      );
    } finally {
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleAvatarClear = async () => {
    try {
      await updateOwnProfile({ avatar_url: null });
      setAvatarPreviewUrl(null);
      toast.success("Avatar removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove avatar.",
      );
    }
  };

  const handleAvatarInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleAvatarUpload(file);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

  const handleFieldChange = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleCancel = () => {
    if (profile) {
      setForm(profileToForm(profile));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    setIsSaving(true);
    try {
      await updateOwnProfile(formToUpdate(form));
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const stateOptions = useMemo((): WholesaleFormSelectOption[] => {
    if (!form) return [];
    const options: WholesaleFormSelectOption[] = AU_STATES.map((state) => ({
      value: state,
      label: state,
    }));
    if (
      form.state &&
      !AU_STATES.includes(form.state as (typeof AU_STATES)[number])
    ) {
      options.push({ value: form.state, label: form.state });
    }
    return options;
  }, [form]);

  const countryOptions = useMemo((): WholesaleFormSelectOption[] => {
    if (!form) return [];
    const options: WholesaleFormSelectOption[] = COUNTRY_OPTIONS.map(
      (option) => ({
        value: option.value,
        label: option.label,
      }),
    );
    if (
      form.country &&
      !COUNTRY_OPTIONS.some((option) => option.value === form.country)
    ) {
      options.push({ value: form.country, label: form.country });
    }
    return options;
  }, [form]);

  const businessCategoryOptions = useMemo((): WholesaleFormSelectOption[] => {
    if (!form) return [];
    const options: WholesaleFormSelectOption[] = BUSINESS_CATEGORIES.map(
      (option) => ({
        value: option.value,
        label: option.label,
      }),
    );
    if (
      form.business_category &&
      !BUSINESS_CATEGORIES.some(
        (option) => option.value === form.business_category,
      )
    ) {
      options.push({
        value: form.business_category,
        label: businessCategoryLabel(form.business_category),
      });
    }
    return options;
  }, [form]);

  if (isLoading || !me || !profile || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = getContactName(profile);

  return (
    <div className="min-h-screen bg-black text-white">
      <MemberHeader member={me} onLogout={() => void handleLogout()} />

      <form onSubmit={(event) => void handleSubmit(event)}>
        <div className="border-b border-white/10 py-6">
          <div className="container">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-serif text-2xl font-bold text-white truncate">
                    {me.businessName}
                  </h1>
                  <MemberPrivilegeBadges privileges={authMetadata.privileges} />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="md:hidden inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="container max-w-5xl py-8">
          <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
              <div className="mx-auto w-full max-w-xs shrink-0 text-center lg:mx-0 lg:w-auto">
                <div className="relative mx-auto mb-3 flex h-50 w-50 items-center justify-center overflow-hidden rounded-lg border border-primary/30 bg-primary/20 p-1">
                  {avatarPreviewUrl ? (
                    <AppImage
                      src={avatarPreviewUrl}
                      alt={displayName}
                      width={80}
                      height={80}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-primary">
                      {getInitials(profile)}
                    </span>
                  )}
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploading || isSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {avatarPreviewUrl ? "Replace" : "Upload"}
                  </button>
                  {avatarPreviewUrl ? (
                    <button
                      type="button"
                      onClick={() => void handleAvatarClear()}
                      disabled={isUploading || isSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-white/35">
                  JPEG, PNG, WebP or GIF.
                </p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept={AVATAR_ACCEPT}
                  className="sr-only"
                  disabled={isUploading || isSaving}
                  onChange={(event) => void handleAvatarInputChange(event)}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="mb-5 text-base font-semibold text-white">
                  Personal Details
                </h2>
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="first_name" className={LABEL_CLASS}>
                      First Name
                    </label>
                    <input
                      id="first_name"
                      type="text"
                      value={form.first_name}
                      onChange={(event) =>
                        handleFieldChange("first_name", event.target.value)
                      }
                      className={INPUT_CLASS}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="last_name" className={LABEL_CLASS}>
                      Last Name
                    </label>
                    <input
                      id="last_name"
                      type="text"
                      value={form.last_name}
                      onChange={(event) =>
                        handleFieldChange("last_name", event.target.value)
                      }
                      className={INPUT_CLASS}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="date_of_birth" className={LABEL_CLASS}>
                      Date of Birth
                    </label>
                    <input
                      id="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={(event) =>
                        handleFieldChange("date_of_birth", event.target.value)
                      }
                      className={`${INPUT_CLASS} [color-scheme:dark]`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className={LABEL_CLASS}>
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        handleFieldChange("phone", event.target.value)
                      }
                      className={INPUT_CLASS}
                      autoComplete="tel"
                      placeholder="+61 412 345 678"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-5 text-base font-semibold text-white">
                  Shipping Address
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="address_line1" className={LABEL_CLASS}>
                      Address Line 1
                    </label>
                    <input
                      id="address_line1"
                      type="text"
                      value={form.address_line1}
                      onChange={(event) =>
                        handleFieldChange("address_line1", event.target.value)
                      }
                      className={INPUT_CLASS}
                      autoComplete="address-line1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="address_line2" className={LABEL_CLASS}>
                      Address Line 2
                    </label>
                    <input
                      id="address_line2"
                      type="text"
                      value={form.address_line2}
                      onChange={(event) =>
                        handleFieldChange("address_line2", event.target.value)
                      }
                      className={INPUT_CLASS}
                      autoComplete="address-line2"
                      placeholder="Suite, unit, etc. (optional)"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="city" className={LABEL_CLASS}>
                        City
                      </label>
                      <input
                        id="city"
                        type="text"
                        value={form.city}
                        onChange={(event) =>
                          handleFieldChange("city", event.target.value)
                        }
                        className={INPUT_CLASS}
                        autoComplete="address-level2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="suburb" className={LABEL_CLASS}>
                        Suburb
                      </label>
                      <input
                        id="suburb"
                        type="text"
                        value={form.suburb}
                        onChange={(event) =>
                          handleFieldChange("suburb", event.target.value)
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="state" className={LABEL_CLASS}>
                        State
                      </label>
                      <WholesaleFormSelect
                        id="state"
                        value={form.state}
                        onValueChange={(value) => handleFieldChange("state", value)}
                        options={stateOptions}
                        placeholder="Select state"
                        allowEmpty
                        emptyLabel="Select state"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="postal_code" className={LABEL_CLASS}>
                        Postal Code
                      </label>
                      <input
                        id="postal_code"
                        type="text"
                        value={form.postal_code}
                        onChange={(event) =>
                          handleFieldChange("postal_code", event.target.value)
                        }
                        className={INPUT_CLASS}
                        autoComplete="postal-code"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="country" className={LABEL_CLASS}>
                        Country
                      </label>
                      <WholesaleFormSelect
                        id="country"
                        value={form.country}
                        onValueChange={(value) =>
                          handleFieldChange("country", value)
                        }
                        options={countryOptions}
                        placeholder="Select country"
                      />
                    </div>                    
                  </div>
                </div>
              </section>              
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="mb-5 text-base font-semibold text-white">
                  Business Information
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="business_name" className={LABEL_CLASS}>
                      Business Name
                    </label>
                    <input
                      id="business_name"
                      type="text"
                      value={form.business_name}
                      onChange={(event) =>
                        handleFieldChange("business_name", event.target.value)
                      }
                      className={INPUT_CLASS}
                      autoComplete="organization"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="abn" className={LABEL_CLASS}>
                      ABN
                    </label>
                    <input
                      id="abn"
                      type="text"
                      value={form.abn}
                      onChange={(event) =>
                        handleFieldChange("abn", event.target.value)
                      }
                      className={INPUT_CLASS}
                      placeholder="12 345 678 901"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="business_category" className={LABEL_CLASS}>
                      Business Category
                    </label>
                    <WholesaleFormSelect
                      id="business_category"
                      value={form.business_category}
                      onValueChange={(value) =>
                        handleFieldChange("business_category", value)
                      }
                      options={businessCategoryOptions}
                      placeholder="Select business category"
                      allowEmpty
                      emptyLabel="Select business category"
                    />
                  </div>                  
                </div>
              </section>
              
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
