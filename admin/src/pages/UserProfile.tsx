'use client';

import { ChangePasswordDialog } from '@/components/profile/ChangePasswordDialog';
import { DashboardLayout } from '@/components/layout';
import { ImageUpload } from '@/components/ImageUpload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { UserProfileUpdate } from '@/types/UserProfile';
import { KeyRound, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  none: 'No access',
  user: 'User',
  admin: 'Administrator',
  partner: 'Partner',
};

type ProfileFormState = {
  email: string;
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
};

const emptyForm: ProfileFormState = {
  email: '',
  first_name: '',
  last_name: '',
  date_of_birth: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  suburb: '',
  state: '',
  postal_code: '',
  country: 'AU',
};

function profileToForm(profile: NonNullable<ReturnType<typeof useUserProfile>['profile']>): ProfileFormState {
  return {
    email: profile.email ?? '',
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    date_of_birth: profile.date_of_birth ?? '',
    phone: profile.phone ?? '',
    address_line1: profile.address_line1 ?? '',
    address_line2: profile.address_line2 ?? '',
    city: profile.city ?? '',
    suburb: profile.suburb ?? '',
    state: profile.state ?? '',
    postal_code: profile.postal_code ?? '',
    country: profile.country ?? 'AU',
  };
}

function formToUpdate(form: ProfileFormState): UserProfileUpdate {
  const trim = (value: string) => value.trim();
  const nullable = (value: string) => {
    const next = trim(value);
    return next === '' ? null : next;
  };

  return {
    email: nullable(form.email),
    first_name: nullable(form.first_name),
    last_name: nullable(form.last_name),
    date_of_birth: nullable(form.date_of_birth),
    phone: nullable(form.phone),
    address_line1: nullable(form.address_line1),
    address_line2: nullable(form.address_line2),
    city: nullable(form.city),
    suburb: nullable(form.suburb),
    state: nullable(form.state),
    postal_code: nullable(form.postal_code),
    country: nullable(form.country) ?? 'AU',
  };
}

export function UserProfile() {
  const {
    profile,
    avatarPreviewUrl,
    isLoading,
    isSaving,
    updateProfile,
    setAvatarPreviewUrl,
  } = useUserProfile();
  const { uploadMedia, isUploading } = useSupabaseStorage();

  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm(profileToForm(profile));
    }
  }, [profile]);

  const setField = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await updateProfile(formToUpdate(form));
      toast.success('Profile saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile.';
      toast.error(message);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    try {
      const { path, signedUrl } = await uploadMedia(file, {
        folder: 'avatars',
        fileName: `avatar.${ext}`,
        upsert: true,
      });
      await updateProfile({ avatar_url: path });
      setAvatarPreviewUrl(signedUrl);
      toast.success('Avatar updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar.';
      toast.error(message);
      throw err;
    }
  };

  const handleAvatarClear = async () => {
    try {
      await updateProfile({ avatar_url: null });
      setAvatarPreviewUrl(null);
      toast.success('Avatar removed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove avatar.';
      toast.error(message);
    }
  };

  const displayName =
    profile?.display_name?.trim() ||
    [form.first_name, form.last_name].filter(Boolean).join(' ') ||
    form.email.split('@')[0] ||
    'Your profile';

  return (
    <DashboardLayout title="User Profile">
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Update your personal information. Your role is managed by an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 size-5 animate-spin" />
                Loading profile…
              </div>
            ) : (
              <>
                <ImageUpload
                  label="Profile photo"
                  description="JPEG, PNG, WebP or GIF. Shown in the header menu."
                  value={avatarPreviewUrl}
                  onFileSelect={handleAvatarUpload}
                  onClear={profile?.avatar_url ? handleAvatarClear : undefined}
                  isUploading={isUploading}
                  disabled={isSaving}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Account role</span>
                  <Badge variant="secondary">
                    {ROLE_LABELS[profile?.user_role ?? 'user'] ?? profile?.user_role}
                  </Badge>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      autoComplete="email"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="first_name">First name</Label>
                    <Input
                      id="first_name"
                      value={form.first_name}
                      onChange={(e) => setField('first_name', e.target.value)}
                      autoComplete="given-name"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="last_name">Last name</Label>
                    <Input
                      id="last_name"
                      value={form.last_name}
                      onChange={(e) => setField('last_name', e.target.value)}
                      autoComplete="family-name"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date_of_birth">Date of birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={(e) => setField('date_of_birth', e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      autoComplete="tel"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Address</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="address_line1">Address line 1</Label>
                      <Input
                        id="address_line1"
                        value={form.address_line1}
                        onChange={(e) => setField('address_line1', e.target.value)}
                        autoComplete="address-line1"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="address_line2">Address line 2</Label>
                      <Input
                        id="address_line2"
                        value={form.address_line2}
                        onChange={(e) => setField('address_line2', e.target.value)}
                        autoComplete="address-line2"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="suburb">Suburb</Label>
                      <Input
                        id="suburb"
                        value={form.suburb}
                        onChange={(e) => setField('suburb', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => setField('city', e.target.value)}
                        autoComplete="address-level2"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={form.state}
                        onChange={(e) => setField('state', e.target.value)}
                        autoComplete="address-level1"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="postal_code">Postal code</Label>
                      <Input
                        id="postal_code"
                        value={form.postal_code}
                        onChange={(e) => setField('postal_code', e.target.value)}
                        autoComplete="postal-code"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={form.country}
                        onChange={(e) => setField('country', e.target.value)}
                        autoComplete="country-name"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" disabled={isSaving || isLoading}>
                    {isSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your sign-in password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordDialogOpen(true)}
            >
              <KeyRound className="size-4" />
              Change password
            </Button>
          </CardContent>
        </Card>
      </form>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />

      {!isLoading && profile ? (
        <p className="sr-only">Signed in as {displayName}</p>
      ) : null}
    </DashboardLayout>
  );
}
