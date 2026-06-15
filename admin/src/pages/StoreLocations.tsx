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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import {
  SalesOrderFormField,
  SalesOrderFormSection,
  salesOrderFormGridClass,
} from '@/pages/Sales/SalesOrderFormField';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type StoreLocationRow = {
  id: number;
  name: string;
  address: string;
  suburb: string | null;
  lat: string | null;
  lng: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  is_active: boolean;
  is_invoice_creator: boolean;
  is_shipping: boolean;
  delivery_url: string | null;
  google_map_url: string | null;
  is_franchise: boolean;
  franchise_owner_name: string | null;
  franchise_owner_email: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string | null;
  platform_fee_percent: string | null;
};

const SELECT_COLUMNS =
  'id, name, address, suburb, lat, lng, phone, email, hours, is_active, is_invoice_creator, is_shipping, delivery_url, google_map_url, is_franchise, franchise_owner_name, franchise_owner_email, stripe_connect_account_id, stripe_connect_status, platform_fee_percent';

const emptyStoreLocationInput = (): StoreLocationRow => ({
  id: 0,
  name: '',
  address: '',
  suburb: '',
  lat: '',
  lng: '',
  phone: '',
  email: '',
  hours: '',
  is_active: true,
  is_invoice_creator: false,
  is_shipping: false,
  delivery_url: '',
  google_map_url: '',
  is_franchise: false,
  franchise_owner_name: '',
  franchise_owner_email: '',
  stripe_connect_account_id: '',
  stripe_connect_status: 'not_connected',
  platform_fee_percent: '5.00',
});

async function nextStoreLocationId(): Promise<number> {
  const { data, error } = await supabase
    .from('store_locations')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxId = data?.[0]?.id ?? 0;
  return Number(maxId) + 1;
}

function formatHoursForEdit(hours: string | null): string {
  if (!hours?.trim()) return '';
  try {
    return JSON.stringify(JSON.parse(hours), null, 2);
  } catch {
    return hours;
  }
}

function rowToForm(row: StoreLocationRow): StoreLocationRow {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    suburb: row.suburb ?? '',
    lat: row.lat ?? '',
    lng: row.lng ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    hours: formatHoursForEdit(row.hours),
    is_active: row.is_active,
    is_invoice_creator: row.is_invoice_creator,
    is_shipping: row.is_shipping,
    delivery_url: row.delivery_url ?? '',
    google_map_url: row.google_map_url ?? '',
    is_franchise: row.is_franchise,
    franchise_owner_name: row.franchise_owner_name ?? '',
    franchise_owner_email: row.franchise_owner_email ?? '',
    stripe_connect_account_id: row.stripe_connect_account_id ?? '',
    stripe_connect_status: row.stripe_connect_status ?? 'not_connected',
    platform_fee_percent: row.platform_fee_percent ?? '',
  };
}

function formToPayload(form: StoreLocationRow): StoreLocationRow {
  let hoursValue: string | null = null;
  if (form.hours?.trim()) {
    try {
      hoursValue = JSON.stringify(JSON.parse(form.hours));
    } catch {
      hoursValue = form.hours.trim();
    }
  }

  return {
    id: form.id,
    name: form.name.trim(),
    address: form.address.trim(),
    suburb: form.suburb?.trim() || null,
    lat: form.lat?.trim() || null,
    lng: form.lng?.trim() || null,
    phone: form.phone?.trim() || null,
    email: form.email?.trim() || null,
    hours: hoursValue,
    is_active: form.is_active,
    is_invoice_creator: form.is_invoice_creator,
    is_shipping: form.is_shipping,
    delivery_url: form.delivery_url?.trim() || null,
    google_map_url: form.google_map_url?.trim() || null,
    is_franchise: form.is_franchise,
    franchise_owner_name: form.franchise_owner_name?.trim() || null,
    franchise_owner_email: form.franchise_owner_email?.trim() || null,
    stripe_connect_account_id: form.stripe_connect_account_id?.trim() || null,
    stripe_connect_status: form.stripe_connect_status?.trim() || null,
    platform_fee_percent: form.platform_fee_percent?.trim() || null,
  };
}

export function StoreLocations() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [locations, setLocations] = useState<StoreLocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<StoreLocationRow>(emptyStoreLocationInput());

  const [deleteTarget, setDeleteTarget] = useState<StoreLocationRow | null>(
    null,
  );
  const [search, setSearch] = useState('');

  const loadLocations = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('store_locations')
        .select(SELECT_COLUMNS)
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setLocations((data ?? []) as StoreLocationRow[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load store locations.';
      setError(message);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadLocations();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadLocations]);

  const filteredLocations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return locations;
    return locations.filter((loc) => {
      return (
        loc.name.toLowerCase().includes(term) ||
        loc.address.toLowerCase().includes(term) ||
        (loc.suburb ?? '').toLowerCase().includes(term) ||
        (loc.phone ?? '').toLowerCase().includes(term) ||
        (loc.email ?? '').toLowerCase().includes(term)
      );
    });
  }, [locations, search]);

  const openCreate = async () => {
    try {
      const id = await nextStoreLocationId();
      setEditingId(null);
      setForm({
        ...emptyStoreLocationInput(),
        id,
      });
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not prepare new store location.',
      );
    }
  };

  const openEdit = (loc: StoreLocationRow) => {
    setEditingId(loc.id);
    setForm(rowToForm(loc));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!form.address.trim()) {
      toast.error('Address is required.');
      return;
    }

    if (form.hours?.trim()) {
      try {
        JSON.parse(form.hours);
      } catch {
        toast.error('Hours must be valid JSON (or left empty).');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = formToPayload(form);

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('store_locations')
          .update({
            name: payload.name,
            address: payload.address,
            suburb: payload.suburb,
            lat: payload.lat,
            lng: payload.lng,
            phone: payload.phone,
            email: payload.email,
            hours: payload.hours,
            is_active: payload.is_active,
            is_invoice_creator: payload.is_invoice_creator,
            is_shipping: payload.is_shipping,
            delivery_url: payload.delivery_url,
            google_map_url: payload.google_map_url,
            is_franchise: payload.is_franchise,
            franchise_owner_name: payload.franchise_owner_name,
            franchise_owner_email: payload.franchise_owner_email,
            stripe_connect_account_id: payload.stripe_connect_account_id,
            stripe_connect_status: payload.stripe_connect_status,
            platform_fee_percent: payload.platform_fee_percent,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Store location updated.');
      } else {
        const { error: insertError } = await supabase
          .from('store_locations')
          .insert({
            id: payload.id,
            name: payload.name,
            address: payload.address,
            suburb: payload.suburb,
            lat: payload.lat,
            lng: payload.lng,
            phone: payload.phone,
            email: payload.email,
            hours: payload.hours,
            is_active: payload.is_active,
            is_invoice_creator: payload.is_invoice_creator,
            is_shipping: payload.is_shipping,
            delivery_url: payload.delivery_url,
            google_map_url: payload.google_map_url,
            is_franchise: payload.is_franchise,
            franchise_owner_name: payload.franchise_owner_name,
            franchise_owner_email: payload.franchise_owner_email,
            stripe_connect_account_id: payload.stripe_connect_account_id,
            stripe_connect_status: payload.stripe_connect_status,
            platform_fee_percent: payload.platform_fee_percent,
          });

        if (insertError) throw insertError;
        toast.success('Store location created.');
      }

      setDialogOpen(false);
      await loadLocations();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save store location.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('store_locations')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Store location deleted.');
      setDeleteTarget(null);
      await loadLocations();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete store location.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Store Locations">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Store Locations">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage store locations.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Store Locations">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Store locations</CardTitle>
              <CardDescription>
                Manage locations shown on the store finder and pickup flows.
              </CardDescription>
            </div>
            <Button onClick={() => void openCreate()} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add location
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Input
              placeholder="Search by name, address, suburb, phone or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No store locations found. Add one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Suburb
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Active
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Franchise
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Delivery URL
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLocations.map((loc) => (
                      <tr
                        key={loc.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">
                          {loc.id}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{loc.name}</span>
                            {loc.is_invoice_creator ? (
                              <Badge variant="default">Invoice</Badge>
                            ) : null}
                            {loc.is_shipping ? (
                              <Badge variant="outline">Shipping</Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {loc.suburb ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {loc.phone ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={loc.is_active ? 'default' : 'secondary'}
                          >
                            {loc.is_active ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              loc.is_franchise ? 'default' : 'secondary'
                            }
                          >
                            {loc.is_franchise ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="max-w-[12rem] px-4 py-3 text-sm">
                          {loc.delivery_url?.trim() ? (
                            <a
                              href={loc.delivery_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate text-primary underline-offset-4 hover:underline"
                              title={loc.delivery_url}
                            >
                              {loc.delivery_url}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(loc)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(loc)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle>
              {editingId !== null ? 'Edit store location' : 'Add store location'}
            </DialogTitle>
            <DialogDescription>
              Active locations appear on the public store finder. Invoice creator
              locations supply company details on wholesale order invoices.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <SalesOrderFormSection
              title="Basics"
              description="Core identity and visibility on the public site."
            >
              <div className={salesOrderFormGridClass}>
                <SalesOrderFormField label="ID" htmlFor="loc-id">
                  <Input
                    id="loc-id"
                    type="number"
                    value={form.id}
                    disabled={editingId !== null}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, id: Number(e.target.value) || 0 }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Active" htmlFor="loc-active">
                  <Select
                    value={form.is_active ? 'yes' : 'no'}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, is_active: value === 'yes' }))
                    }
                  >
                    <SelectTrigger id="loc-active">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </SalesOrderFormField>
                <SalesOrderFormField
                  label="Invoice creator"
                  htmlFor="loc-invoice-creator"
                  className="md:col-span-2"
                >
                  <Select
                    value={form.is_invoice_creator ? 'yes' : 'no'}
                    onValueChange={(value) =>
                      setForm((f) => ({
                        ...f,
                        is_invoice_creator: value === 'yes',
                      }))
                    }
                  >
                    <SelectTrigger id="loc-invoice-creator">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">
                        Yes — use this location on order invoices
                      </SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </SalesOrderFormField>
                <SalesOrderFormField
                  label="Shipping origin"
                  htmlFor="loc-shipping"
                  className="md:col-span-2"
                >
                  <Select
                    value={form.is_shipping ? 'yes' : 'no'}
                    onValueChange={(value) =>
                      setForm((f) => ({
                        ...f,
                        is_shipping: value === 'yes',
                      }))
                    }
                  >
                    <SelectTrigger id="loc-shipping">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">
                        Yes — use as wholesale freight dispatch point
                      </SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </SalesOrderFormField>
                <SalesOrderFormField
                  label="Name"
                  htmlFor="loc-name"
                  className="md:col-span-2"
                >
                  <Input
                    id="loc-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
              </div>
            </SalesOrderFormSection>

            <SalesOrderFormSection
              title="Location & contact"
              description="Street address, suburb, and map coordinates."
            >
              <div className={salesOrderFormGridClass}>
                <SalesOrderFormField
                  label="Address"
                  htmlFor="loc-address"
                  className="md:col-span-2"
                >
                  <Input
                    id="loc-address"
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Suburb" htmlFor="loc-suburb">
                  <Input
                    id="loc-suburb"
                    value={form.suburb ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, suburb: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Phone" htmlFor="loc-phone">
                  <Input
                    id="loc-phone"
                    value={form.phone ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Email" htmlFor="loc-email">
                  <Input
                    id="loc-email"
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="info@saigonexpress.com.au"
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Latitude" htmlFor="loc-lat">
                  <Input
                    id="loc-lat"
                    value={form.lat ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lat: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField label="Longitude" htmlFor="loc-lng">
                  <Input
                    id="loc-lng"
                    value={form.lng ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lng: e.target.value }))
                    }
                  />
                </SalesOrderFormField>
              </div>
            </SalesOrderFormSection>

            <SalesOrderFormSection
              title="Links & hours"
              description="Delivery partners, map links, and opening hours."
            >
              <div className="space-y-4">
                <div className={salesOrderFormGridClass}>
                  <SalesOrderFormField
                    label="Delivery URL"
                    htmlFor="loc-delivery"
                    className="md:col-span-2"
                  >
                    <Input
                      id="loc-delivery"
                      value={form.delivery_url ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, delivery_url: e.target.value }))
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Google Map URL"
                    htmlFor="loc-google-map"
                    className="md:col-span-2"
                  >
                    <Input
                      id="loc-google-map"
                      type="url"
                      value={form.google_map_url ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          google_map_url: e.target.value,
                        }))
                      }
                      placeholder="https://maps.google.com/..."
                    />
                  </SalesOrderFormField>
                </div>
                <SalesOrderFormField label="Hours (JSON)" htmlFor="loc-hours">
                  <Textarea
                    id="loc-hours"
                    rows={5}
                    value={form.hours ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hours: e.target.value }))
                    }
                    placeholder='{"mon":"11:00 AM - 8:30 PM","tue":"11:00 AM - 8:30 PM",...}'
                    className="font-mono text-xs"
                  />
                </SalesOrderFormField>
              </div>
            </SalesOrderFormSection>

            <SalesOrderFormSection
              title="Franchise & payments"
              description="Franchise ownership and Stripe Connect settings."
            >
              <div className={salesOrderFormGridClass}>
                <SalesOrderFormField label="Franchise location" htmlFor="loc-franchise">
                  <Select
                    value={form.is_franchise ? 'yes' : 'no'}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, is_franchise: value === 'yes' }))
                    }
                  >
                    <SelectTrigger id="loc-franchise">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </SalesOrderFormField>
                <SalesOrderFormField label="Platform fee %" htmlFor="loc-fee">
                  <Input
                    id="loc-fee"
                    value={form.platform_fee_percent ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        platform_fee_percent: e.target.value,
                      }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField
                  label="Franchise owner name"
                  htmlFor="loc-owner-name"
                >
                  <Input
                    id="loc-owner-name"
                    value={form.franchise_owner_name ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        franchise_owner_name: e.target.value,
                      }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField
                  label="Franchise owner email"
                  htmlFor="loc-owner-email"
                >
                  <Input
                    id="loc-owner-email"
                    type="email"
                    value={form.franchise_owner_email ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        franchise_owner_email: e.target.value,
                      }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField
                  label="Stripe Connect account ID"
                  htmlFor="loc-stripe-id"
                >
                  <Input
                    id="loc-stripe-id"
                    value={form.stripe_connect_account_id ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stripe_connect_account_id: e.target.value,
                      }))
                    }
                  />
                </SalesOrderFormField>
                <SalesOrderFormField
                  label="Stripe Connect status"
                  htmlFor="loc-stripe-status"
                >
                  <Input
                    id="loc-stripe-status"
                    value={form.stripe_connect_status ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stripe_connect_status: e.target.value,
                      }))
                    }
                  />
                </SalesOrderFormField>
              </div>
            </SalesOrderFormSection>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save location'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete store location?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.name}</strong>.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
