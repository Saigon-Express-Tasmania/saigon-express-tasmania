import { PendingPartnersList } from '@/components/partners/PendingPartnersList';
import { DashboardLayout } from '@/components/layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  createPartnerAccount,
  deletePartnerAccount,
  isPartnerBusinessType,
} from '@/lib/partner-api';
import {
  confirmPartnerProfile,
  fetchConfirmedPartners,
  fetchPendingPartners,
  PARTNERS_PAGE_PENDING_LIMIT,
  formatPartnerDate,
  partnerDisplayName,
} from '@/lib/partner-profiles';
import { updateUserMetadata } from '@/lib/user-metadata';
import supabase from '@/lib/supabase/client';
import type {
  AdminPartnerInput,
  PartnerBusinessType,
  UserProfile,
  UserRole,
} from '@/types/UserProfile';
import {
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const ROLE_LABELS: Record<UserRole, string> = {
  none: 'No access',
  user: 'User',
  admin: 'Administrator',
  partner: 'Partner',
};

const BUSINESS_CATEGORY_OPTIONS = [
  'restaurant',
  'cafe',
  'catering',
  'retail',
  'hotel',
  'school',
  'corporate',
  'other',
] as const;

type PartnerFormState = AdminPartnerInput & {
  email: string;
  password: string;
};

function emptyPartnerForm(businessType: PartnerBusinessType): PartnerFormState {
  return {
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    suburb: '',
    state: '',
    postal_code: '',
    country: 'AU',
    business_name: '',
    abn: '',
    business_category: '',
    business_type: businessType,
    user_role: 'user',
    is_verified: false,
    date_of_birth: '',
  };
}

function profileToForm(profile: UserProfile): PartnerFormState {
  return {
    email: profile.email ?? '',
    password: '',
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    phone: profile.phone ?? '',
    address_line1: profile.address_line1 ?? '',
    address_line2: profile.address_line2 ?? '',
    city: profile.city ?? '',
    suburb: profile.suburb ?? '',
    state: profile.state ?? '',
    postal_code: profile.postal_code ?? '',
    country: profile.country ?? 'AU',
    business_name: profile.business_name ?? '',
    abn: profile.abn ?? '',
    business_category: profile.business_category ?? '',
    business_type:
      profile.business_type === 'warehouse' ? 'warehouse' : 'wholesale',
    user_role: profile.user_role,
    is_verified: profile.is_verified,
    date_of_birth: profile.date_of_birth ?? '',
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function formToProfilePayload(form: PartnerFormState) {
  return {
    email: nullable(form.email),
    first_name: nullable(form.first_name),
    last_name: nullable(form.last_name),
    phone: nullable(form.phone),
    address_line1: nullable(form.address_line1),
    address_line2: nullable(form.address_line2),
    city: nullable(form.city),
    suburb: nullable(form.suburb),
    state: nullable(form.state),
    postal_code: nullable(form.postal_code),
    country: nullable(form.country) ?? 'AU',
    business_name: nullable(form.business_name),
    abn: nullable(form.abn),
    business_category: nullable(form.business_category),
    business_type: form.business_type,
    date_of_birth: nullable(form.date_of_birth),
  };
}

function formToMetadataPayload(form: PartnerFormState) {
  return {
    user_role: form.user_role,
    is_verified: form.is_verified,
  };
}

export function Partners() {
  const { partnerType } = useParams<{ partnerType: string }>();
  const { profile: adminProfile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = adminProfile?.user_role === 'admin';

  const businessType: PartnerBusinessType | null = useMemo(() => {
    if (!partnerType || !isPartnerBusinessType(partnerType)) return null;
    return partnerType;
  }, [partnerType]);

  const [pendingPartners, setPendingPartners] = useState<UserProfile[]>([]);
  const [pendingTotalCount, setPendingTotalCount] = useState(0);
  const [confirmedPartners, setConfirmedPartners] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmPromptId, setConfirmPromptId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<PartnerFormState>(() =>
    emptyPartnerForm('wholesale'),
  );

  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);

  const loadPartners = useCallback(async () => {
    if (!businessType) return;

    setLoading(true);
    try {
      const [pendingResult, confirmed] = await Promise.all([
        fetchPendingPartners({
          businessType,
          limit: PARTNERS_PAGE_PENDING_LIMIT,
        }),
        fetchConfirmedPartners(businessType),
      ]);
      setPendingPartners(pendingResult.items);
      setPendingTotalCount(pendingResult.totalCount);
      setConfirmedPartners(confirmed);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load partners.',
      );
    } finally {
      setLoading(false);
    }
  }, [businessType]);

  useEffect(() => {
    if (!profileLoading && isAdmin && businessType) {
      void loadPartners();
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [profileLoading, isAdmin, businessType, loadPartners]);

  const setField = <K extends keyof PartnerFormState>(
    field: K,
    value: PartnerFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreate = () => {
    if (!businessType) return;
    setEditingPartner(null);
    setForm(emptyPartnerForm(businessType));
    setDialogOpen(true);
  };

  const openEdit = (partner: UserProfile) => {
    setEditingPartner(partner);
    setForm(profileToForm(partner));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!businessType) return;

    if (editingPartner) {
      if (!form.email.trim()) {
        toast.error('Email is required.');
        return;
      }

      setSaving(true);
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(formToProfilePayload(form))
          .eq('id', editingPartner.id);

        if (profileError) throw profileError;

        await updateUserMetadata(editingPartner.id, formToMetadataPayload(form));

        toast.success('Partner updated.');
        setDialogOpen(false);
        await loadPartners();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to update partner.',
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!form.email.trim()) {
      toast.error('Email is required.');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      await createPartnerAccount({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        address_line1: form.address_line1,
        address_line2: form.address_line2,
        city: form.city,
        suburb: form.suburb,
        state: form.state,
        postal_code: form.postal_code,
        country: form.country,
        business_name: form.business_name,
        abn: form.abn,
        business_category: form.business_category,
        business_type: businessType,
        user_role: form.user_role,
        is_verified: form.is_verified,
        date_of_birth: form.date_of_birth,
      });
      toast.success('Partner created.');
      setDialogOpen(false);
      await loadPartners();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create partner.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (partner: UserProfile) => {
    setConfirmingId(partner.id);
    try {
      await confirmPartnerProfile(partner);
      toast.success(`${partnerDisplayName(partner)} confirmed.`);
      await loadPartners();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to confirm partner.',
      );
    } finally {
      setConfirmingId(null);
      setConfirmPromptId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      await deletePartnerAccount(deleteTarget.id);
      toast.success('Partner deleted.');
      setDeleteTarget(null);
      await loadPartners();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete partner.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPromptToggle = (partnerId: string) => {
    setConfirmPromptId((current) => (current === partnerId ? null : partnerId));
  };

  if (!businessType) {
    return <Navigate to="/partners/wholesale" replace />;
  }

  const pageTitle =
    businessType === 'wholesale' ? 'Wholesale Partners' : 'Warehouse Partners';

  return (
    <DashboardLayout
      title={pageTitle}
      headerContent={
        <div className="flex items-center gap-2">
          {(['wholesale', 'warehouse'] as const).map((type) => (
            <NavLink
              key={type}
              to={`/partners/${type}`}
              className={({ isActive }) =>
                [
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                ].join(' ')
              }
            >
              {type === 'wholesale' ? 'Wholesale' : 'Warehouse'}
            </NavLink>
          ))}
        </div>
      }
    >
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{pageTitle}</CardTitle>
            <CardDescription>
              Manage {businessType} partner accounts, confirm registrations, and
              update profile details.
            </CardDescription>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadPartners()}
                disabled={loading}
              >
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus className="size-4" />
                Add partner
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {profileLoading || loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading partners…
            </div>
          ) : !isAdmin ? (
            <p className="text-muted-foreground">
              Administrator access is required to manage partners.
            </p>
          ) : pendingTotalCount === 0 && confirmedPartners.length === 0 ? (
            <p className="text-muted-foreground">No partners yet.</p>
          ) : (
            <div className="space-y-8">
              {pendingTotalCount > 0 ? (
                <PendingPartnersList
                  partners={pendingPartners}
                  totalCount={pendingTotalCount}
                  limit={PARTNERS_PAGE_PENDING_LIMIT}
                  loading={false}
                  confirmingId={confirmingId}
                  confirmPromptId={confirmPromptId}
                  onConfirmPromptToggle={handleConfirmPromptToggle}
                  onConfirmPromptClose={() => setConfirmPromptId(null)}
                  onConfirm={(partner) => void handleConfirm(partner)}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ) : null}

              {confirmedPartners.length > 0 ? (
                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Confirmed partners</h3>
                    <p className="text-xs text-muted-foreground">
                      {confirmedPartners.length} active{' '}
                      {confirmedPartners.length === 1 ? 'account' : 'accounts'}.
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left text-xs font-semibold">
                            Partner
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">
                            Email
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">
                            Business
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">
                            Phone
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">
                            Category
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">
                            Role
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">
                            Created
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {confirmedPartners.map((partner) => (
                          <tr
                            key={partner.id}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <td className="px-3 py-2 text-sm">
                              <p className="font-medium">{partnerDisplayName(partner)}</p>
                              {partner.abn ? (
                                <p className="text-xs text-muted-foreground">
                                  ABN {partner.abn}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-sm text-muted-foreground">
                              {partner.email ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {partner.business_name ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-sm text-muted-foreground">
                              {partner.phone ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-sm text-muted-foreground">
                              {partner.business_category ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <Badge variant="secondary" className="text-[10px]">
                                {ROLE_LABELS[partner.user_role]}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                              {formatPartnerDate(partner.created_at)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={() => openEdit(partner)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={() => setDeleteTarget(partner)}
                                >
                                  <Trash2 className="size-3.5 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : pendingPartners.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  No confirmed partners yet.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPartner ? 'Edit partner' : 'Add partner'}
            </DialogTitle>
            <DialogDescription>
              {editingPartner
                ? 'Update partner profile fields. Auth email/password changes are not supported here.'
                : 'Create a new partner account with login credentials and profile details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="partner-email">Email</Label>
              <Input
                id="partner-email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                disabled={saving}
              />
            </div>

            {!editingPartner ? (
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="partner-password">Password</Label>
                <Input
                  id="partner-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  autoComplete="new-password"
                  disabled={saving}
                />
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="partner-first-name">First name</Label>
              <Input
                id="partner-first-name"
                value={form.first_name}
                onChange={(e) => setField('first_name', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-last-name">Last name</Label>
              <Input
                id="partner-last-name"
                value={form.last_name}
                onChange={(e) => setField('last_name', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="partner-business-name">Business name</Label>
              <Input
                id="partner-business-name"
                value={form.business_name}
                onChange={(e) => setField('business_name', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partner-abn">ABN</Label>
              <Input
                id="partner-abn"
                value={form.abn}
                onChange={(e) => setField('abn', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-category">Business category</Label>
              <Select
                value={form.business_category || '__none__'}
                onValueChange={(value) =>
                  setField(
                    'business_category',
                    value === '__none__' ? '' : value,
                  )
                }
                disabled={saving}
              >
                <SelectTrigger id="partner-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {BUSINESS_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partner-phone">Phone</Label>
              <Input
                id="partner-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-dob">Date of birth</Label>
              <Input
                id="partner-dob"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setField('date_of_birth', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="partner-address1">Address line 1</Label>
              <Input
                id="partner-address1"
                value={form.address_line1}
                onChange={(e) => setField('address_line1', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="partner-address2">Address line 2</Label>
              <Input
                id="partner-address2"
                value={form.address_line2}
                onChange={(e) => setField('address_line2', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-suburb">Suburb</Label>
              <Input
                id="partner-suburb"
                value={form.suburb}
                onChange={(e) => setField('suburb', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-city">City</Label>
              <Input
                id="partner-city"
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-state">State</Label>
              <Input
                id="partner-state"
                value={form.state}
                onChange={(e) => setField('state', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-postal">Postal code</Label>
              <Input
                id="partner-postal"
                value={form.postal_code}
                onChange={(e) => setField('postal_code', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="partner-country">Country</Label>
              <Input
                id="partner-country"
                value={form.country}
                onChange={(e) => setField('country', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="partner-role">Role</Label>
              <Select
                value={form.user_role}
                onValueChange={(value) => setField('user_role', value as UserRole)}
                disabled={saving}
              >
                <SelectTrigger id="partner-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-verified">Confirmation status</Label>
              <Select
                value={form.is_verified ? 'confirmed' : 'pending'}
                onValueChange={(value) =>
                  setField('is_verified', value === 'confirmed')
                }
                disabled={saving}
              >
                <SelectTrigger id="partner-verified">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending confirmation</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : editingPartner ? (
                'Save changes'
              ) : (
                'Create partner'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete partner?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{' '}
              {deleteTarget ? partnerDisplayName(deleteTarget) : 'this partner'}&apos;s
              auth account and profile. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
